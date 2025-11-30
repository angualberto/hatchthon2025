#!/usr/bin/env python3
"""Servidor WebSocket simples que recebe frames (base64 JPEG) em /video
e responde com métricas JSON {igi, coverage, confidence, mask}.

Uso:
  python src/dashboard/hullguard_realtime_server.py --host 0.0.0.0 --port 8501

Dependências: websockets, pillow, numpy, torch, torchvision
"""
from __future__ import annotations

import asyncio
import base64
import io
import json
import argparse
from pathlib import Path

try:
    import websockets
except Exception:
    raise

from PIL import Image
import numpy as np
import torch

from vision_utils import compute_fouling_from_mask
from train_unet import SimpleUNet
from barnacle_detector import count_cracas_from_mask


MODEL_PATH = Path(__file__).parent.parent / "models" / "unet_best.pth"


def load_model(path: Path):
    if not path.exists():
        print("Modelo não encontrado, fallback para heurística")
        return None
    ck = torch.load(str(path), map_location="cpu")
    state = ck.get("model_state", ck)
    # try infer in_channels from state
    in_ch = 3
    for k, v in state.items():
        if k.endswith('.weight') and v.ndim == 4:
            in_ch = int(v.shape[1])
            break
    model = SimpleUNet(in_channels=in_ch, out_channels=1)
    try:
        model.load_state_dict(state)
    except Exception:
        model.load_state_dict(state, strict=False)
    model.eval()
    return model


def preprocess_pil(pil: Image.Image, target=(256, 256)) -> torch.Tensor:
    pil = pil.convert('RGB').resize(target)
    arr = np.array(pil).astype(np.float32) / 255.0
    t = torch.from_numpy(arr).permute(2, 0, 1).unsqueeze(0).float()
    return t


async def handler(websocket, path, model):
    print(f"Client connected: {path}")
    async for msg in websocket:
        try:
            data = json.loads(msg)
            frame_b64 = data.get('frame')
            if not frame_b64:
                await websocket.send(json.dumps({'error': 'no frame'}))
                continue
            # decode base64
            frame_bytes = base64.b64decode(frame_b64)
            pil = Image.open(io.BytesIO(frame_bytes)).convert('RGB')
            # ensure size 256x256
            tensor = preprocess_pil(pil, target=(256, 256))

            if model is not None:
                with torch.no_grad():
                    logits = model(tensor)
                    probs = torch.sigmoid(logits)[0, 0].cpu().numpy()
                mask = (probs > 0.5).astype(np.uint8) * 255
                igi = float(compute_fouling_from_mask(mask))
                coverage = float(mask.mean() / 255.0)
                confidence = float(np.mean(probs))
                # count barnacles using morphology helper
                try:
                    cr_count, fouling_px, fouling_cm2 = count_cracas_from_mask(mask, cm2_per_pixel=0.0025)
                    cr_count = int(cr_count)
                    fouling_cm2 = float(fouling_cm2)
                    cr_per_cm2 = float(cr_count) / (fouling_cm2 if fouling_cm2 > 0 else 1.0)
                except Exception:
                    cr_count = 0
                    fouling_cm2 = 0.0
                    cr_per_cm2 = 0.0
                # encode mask as PNG base64
                buf = io.BytesIO()
                Image.fromarray(mask).convert('L').save(buf, format='PNG')
                mask_b64 = base64.b64encode(buf.getvalue()).decode('ascii')
                resp = {
                    'igi': igi,
                    'coverage': coverage,
                    'confidence': confidence,
                    'mask': mask_b64,
                    'cracas': cr_count,
                    'cracas_per_cm2': cr_per_cm2,
                    'fouling_cm2': fouling_cm2,
                }
            else:
                # fallback heuristic: use simple brightness/edges
                arr = np.array(pil.resize((256, 256)).convert('L'))
                edge = np.mean(np.abs(np.gradient(arr.astype(float), axis=0))) / 255.0
                igi = float(edge)
                resp = {'igi': igi, 'coverage': 0.0, 'confidence': 0.5}

            await websocket.send(json.dumps(resp))

        except Exception as e:
            print('Error handling frame:', e)
            try:
                await websocket.send(json.dumps({'error': str(e)}))
            except Exception:
                pass


async def main(host: str = '0.0.0.0', port: int = 8501):
    model = None
    try:
        model = load_model(MODEL_PATH)
        if model is not None:
            print('Modelo carregado em', MODEL_PATH)
    except Exception as e:
        print('Falha ao carregar modelo:', e)

    async def _handler(ws, path):
        await handler(ws, path, model)

    print(f'Starting ws server on {host}:{port} (path /video)')
    async with websockets.serve(_handler, host, port, max_size=2**24):
        await asyncio.Future()  # run forever


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', default='0.0.0.0')
    parser.add_argument('--port', default=8501, type=int)
    args = parser.parse_args()
    try:
        asyncio.run(main(host=args.host, port=args.port))
    except KeyboardInterrupt:
        print('Shutting down')
