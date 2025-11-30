"""Inferência em tempo real com câmera usando U-Net treinada.

Se um modelo PyTorch não for informado ou não existir, cai para métricas "fake".

Gera o mesmo arquivo `data/camera_metrics.json` usado pelo dashboard.
"""
from __future__ import annotations

import argparse
import time
import json
import os
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

import torch
import torch.nn.functional as F

from train_unet import SimpleUNet
from vision_utils import apply_frequency_bandpass, compute_fouling_from_mask
from barnacle_detector import process_frame as barnacle_process_frame, compute_cm2_per_pixel


def load_model(path: str, requested_in_channels=3, device=None):
    """Load checkpoint and build a model with the same input channels as the saved weights.

    Returns (model or None, device, model_in_channels)
    """
    if device is None:
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    if not Path(path).exists():
        return None, device, None
    ck = torch.load(path, map_location=device)
    state = ck.get('model_state', ck)

    # try to find the first conv weight key in the encoder to infer input channels
    first_conv_key = None
    for k in state.keys():
        # match pattern like 'downs.0.net.0.weight' used in SimpleUNet
        if k.endswith('.net.0.weight') and 'downs' in k:
            first_conv_key = k
            break
    if first_conv_key is None:
        # fallback: pick the smallest key that looks like a conv weight
        for k in state.keys():
            if k.endswith('.weight') and 'conv' in k.lower():
                first_conv_key = k
                break

    model_in_ch = None
    if first_conv_key is not None:
        w = state[first_conv_key]
        # weight shape is [out_ch, in_ch, k, k]
        if hasattr(w, 'shape'):
            model_in_ch = int(w.shape[1])

    # If we couldn't detect, fall back to requested
    if model_in_ch is None:
        model_in_ch = requested_in_channels

    model = SimpleUNet(in_channels=model_in_ch, out_channels=1)
    try:
        model.load_state_dict(state)
    except Exception as e:
        # try non-strict load to allow some mismatches
        model.load_state_dict(state, strict=False)
    model.to(device)
    model.eval()
    return model, device, model_in_ch


def preprocess_frame(frame: np.ndarray, size=(256,256), use_freq=False):
    # frame: BGR uint8
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    pil = Image.fromarray(rgb)
    pil = pil.resize(size)
    arr = np.array(pil).astype(np.float32) / 255.0
    tensor = torch.from_numpy(arr).permute(2,0,1).unsqueeze(0).float()

    if use_freq:
        freq = apply_frequency_bandpass(np.array(pil).mean(axis=2).astype(np.float32), low_ratio=0.01, high_ratio=0.5)
        freq = (freq / 255.0)[None, ...]
        freq_t = torch.from_numpy(freq).unsqueeze(0).float()
        tensor = torch.cat([tensor, freq_t], dim=1)

    return tensor


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--model', type=str, default=None)
    p.add_argument('--size', nargs=2, type=int, default=[256,256])
    p.add_argument('--use_freq', action='store_true')
    p.add_argument('--use_barnacle', action='store_true', help='Usar detector por morfologia para contar cracas')
    p.add_argument('--camera-fov', type=float, default=None, help='FOV horizontal da câmera em graus (opcional)')
    p.add_argument('--distance-cm', type=float, default=None, help='Distância fixa câmera->superfície em cm (opcional)')
    p.add_argument('--resolution', nargs=2, type=int, default=None, help='Resolução usada (width height) opcional para calibração')
    args = p.parse_args()

    data_dir = Path(__file__).parent / 'data'
    data_dir.mkdir(parents=True, exist_ok=True)
    metrics_path = data_dir / 'camera_metrics.json'

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print('Nao foi possivel abrir a camera.')
        return

    in_ch = 3 + (1 if args.use_freq else 0)
    model, device, model_in_ch = None, None, None
    if args.model:
        model, device, model_in_ch = load_model(args.model, requested_in_channels=in_ch)
        if model is not None:
            print('Modelo carregado:', args.model, f'(trained_in_ch={model_in_ch})')
        else:
            print('Modelo nao encontrado, usando metricas fake.')

    # Decide whether to include frequency channel based on what the model expects
    effective_use_freq = (model_in_ch == 4)
    if args.use_freq and not effective_use_freq:
        print('Aviso: --use_freq solicitado, mas o modelo treinado espera 3 canais. Ignorando canal de frequencia no preprocessamento.')
    if effective_use_freq and not args.use_freq:
        print('Aviso: modelo espera canal de frequencia; preprocess vai gerar automaticamente o canal adicional.')

    # compute cm2_per_pixel if requested
    cm2_per_pixel = 0.0025
    if args.camera_fov and args.distance_cm and args.resolution:
        w_px, h_px = args.resolution
        try:
            cm2_per_pixel = compute_cm2_per_pixel(args.camera_fov, args.distance_cm, w_px, h_px)
            print(f'Calibrado cm^2/pixel = {cm2_per_pixel:.6e}')
        except Exception as e:
            print('Falha ao calcular cm2_per_pixel:', e)

    print('Iniciando inferencia em tempo real. q para sair.')
    frame_id = 0
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                time.sleep(0.5)
                continue
            frame_id += 1

            metrics = None
            mask_vis = None

            # If requested, run barnacle detector (morphology-based)
            if args.use_barnacle:
                annotated, cracas, fouling_percent, cracas_por_cm2, fouling_cm2, mask, heatmap = barnacle_process_frame(frame.copy(), cm2_per_pixel=cm2_per_pixel)
                # build metrics
                metrics = {
                    'method': 'barnacle_detector',
                    'cracas': int(cracas),
                    'fouling_percent': float(fouling_percent),
                    'cracas_per_cm2': float(cracas_por_cm2),
                    'fouling_cm2': float(fouling_cm2),
                }
                overlay = annotated
            elif model is not None:
                tensor = preprocess_frame(frame, size=tuple(args.size), use_freq=effective_use_freq)
                tensor = tensor.to(device)
                with torch.no_grad():
                    logits = model(tensor)
                    probs = torch.sigmoid(logits)[0,0].cpu().numpy()
                    mask = (probs > 0.5).astype(np.uint8)
                    fouling = compute_fouling_from_mask(mask)
                    metrics = {
                        'method': 'unet',
                        'fouling_index': float(fouling),
                        'mask_area_fraction': float(fouling),
                    }
                    # overlay mask
                    mask_vis = (mask * 255).astype(np.uint8)
                    mask_vis = cv2.resize(mask_vis, (frame.shape[1], frame.shape[0]))
                    colored = cv2.applyColorMap(mask_vis, cv2.COLORMAP_JET)
                    overlay = cv2.addWeighted(frame, 0.6, colored, 0.4, 0)
            else:
                # fake heuristic (edge density)
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                edges = cv2.Canny(gray, 100,200)
                edge_density = float(np.mean(edges>0))
                brightness = float(np.mean(gray)/255.0)
                fouling_index = edge_density * (1.0 - brightness)
                metrics = {
                    'method': 'heuristic',
                    'fouling_index': float(fouling_index),
                    'edge_density': float(edge_density),
                    'brightness': float(brightness)
                }
                overlay = frame

            payload = {
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'frame_id': frame_id,
                'metrics': metrics,
            }
            # save metrics
            with open(metrics_path, 'w', encoding='utf-8') as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)

            # show
            if model is not None and mask_vis is not None:
                cv2.imshow('HullGuard - infer', overlay)
            else:
                cv2.imshow('HullGuard - infer (fake)', overlay)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

            time.sleep(0.5)

    except KeyboardInterrupt:
        print('\nSaindo...')
    finally:
        cap.release()
        cv2.destroyAllWindows()


if __name__ == '__main__':
    main()
