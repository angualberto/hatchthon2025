"""Treino simples de U-Net para detecção de cracas (barnacles).

Funcionalidades:
- Converte anotações COCO em máscaras (usa vision_utils.coco_annotations_to_masks)
- Dataset PyTorch que carrega imagens e máscaras, redimensiona e normaliza
- Implementação compacta de U-Net
- Treino básico com BCEWithLogitsLoss e salvamento de checkpoint

Uso (exemplo):
  python train_unet.py --coco "Barnacle population.v10i.coco/train/_annotations.coco.json" --images "Barnacle population.v10i.coco/train" --out_masks data/vision/masks/train --epochs 10

Requisitos: pip install torch torchvision pillow numpy pycocotools
"""
from __future__ import annotations

import argparse
import time
from pathlib import Path
import os
import json
import math

import numpy as np
from PIL import Image

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as T

from vision_utils import coco_annotations_to_masks, apply_frequency_bandpass, compute_fouling_from_mask
from barnacle_detector import count_cracas_from_mask


class SimpleUNet(nn.Module):
    """Small U-Net implementation with correct channel handling."""
    def __init__(self, in_channels=3, out_channels=1, features=None):
        super().__init__()
        if features is None:
            features = [32, 64, 128]

        def double_conv(in_ch, out_ch):
            return nn.Sequential(
                nn.Conv2d(in_ch, out_ch, kernel_size=3, padding=1),
                nn.BatchNorm2d(out_ch),
                nn.ReLU(inplace=True),
                nn.Conv2d(out_ch, out_ch, kernel_size=3, padding=1),
                nn.BatchNorm2d(out_ch),
                nn.ReLU(inplace=True),
            )

        self.pool = nn.MaxPool2d(2, 2)

        # Encoder
        self.encs = nn.ModuleList()
        prev_c = in_channels
        for f in features:
            self.encs.append(double_conv(prev_c, f))
            prev_c = f

        # Bottleneck
        self.bottleneck = double_conv(prev_c, prev_c * 2)

        # Decoder: create upconvs and dec blocks separately to avoid confusion
        self.upconvs = nn.ModuleList()
        self.decs = nn.ModuleList()
        curr_c = prev_c * 2
        for f in reversed(features):
            self.upconvs.append(nn.ConvTranspose2d(curr_c, f, kernel_size=2, stride=2))
            # after concat, channels = f (skip) + f (upsampled) = 2*f
            self.decs.append(double_conv(f * 2, f))
            curr_c = f

        self.final = nn.Conv2d(features[0], out_channels, kernel_size=1)

    def forward(self, x):
        skips = []
        for enc in self.encs:
            x = enc(x)
            skips.append(x)
            x = self.pool(x)

        x = self.bottleneck(x)

        # decode
        for upconv, dec, skip in zip(self.upconvs, self.decs, reversed(skips)):
            x = upconv(x)
            # ensure same spatial size
            if x.shape[2:] != skip.shape[2:]:
                x = T.functional.resize(x, size=skip.shape[2:])
            x = torch.cat([skip, x], dim=1)
            x = dec(x)

        return self.final(x)


class BarnacleDataset(Dataset):
    def __init__(self, images_dir, masks_dir, size=(256, 256), use_freq=False):
        self.images_dir = Path(images_dir)
        self.masks_dir = Path(masks_dir)
        self.files = sorted([p for p in self.images_dir.iterdir() if p.suffix.lower() in ('.jpg', '.jpeg', '.png')])
        self.size = size
        self.use_freq = use_freq
        self.transform_img = T.Compose([
            T.Resize(size),
            T.ToTensor(),
        ])
        self.transform_mask = T.Compose([
            T.Resize(size, interpolation=Image.NEAREST),
            T.ToTensor(),
        ])

    def __len__(self):
        return len(self.files)

    def __getitem__(self, idx):
        p = self.files[idx]
        img = Image.open(p).convert('RGB')
        stem = p.stem
        # mask name convention: <stem>_mask.png
        mask_path = self.masks_dir / f"{stem}_mask.png"
        if not mask_path.exists():
            # fallback: zero mask
            mask = Image.new('L', img.size, 0)
        else:
            mask = Image.open(mask_path).convert('L')

        img_t = self.transform_img(img)
        mask_t = self.transform_mask(mask)

        if self.use_freq:
            # produce frequency-filtered grayscale channel and append
            img_np = np.array(img.resize(self.size)).astype(np.uint8)
            freq = apply_frequency_bandpass(img_np.mean(axis=2).astype(np.float32), low_ratio=0.01, high_ratio=0.5)
            freq = Image.fromarray(freq.astype(np.uint8)).convert('L')
            freq_t = T.ToTensor()(freq)
            img_t = torch.cat([img_t, freq_t], dim=0)

        return img_t, mask_t


def train(args):
    # ensure masks exist
    if args.coco and (not Path(args.out_masks).exists() or args.force_masks):
        print("Gerando máscaras a partir do COCO annotations...")
        coco_annotations_to_masks(args.coco, args.images, args.out_masks, size=tuple(args.size) if args.size else None)

    # dataset
    ds = BarnacleDataset(args.images, args.out_masks, size=tuple(args.size), use_freq=args.use_freq)
    val_ds = ds  # for simplicity; user can pass separate valid folders

    train_loader = DataLoader(ds, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    in_ch = 3 + (1 if args.use_freq else 0)
    model = SimpleUNet(in_channels=in_ch, out_channels=1)
    model = model.to(device)

    criterion = nn.BCEWithLogitsLoss()
    opt = torch.optim.Adam(model.parameters(), lr=args.lr)

    best_loss = 1e9
    for epoch in range(args.epochs):
        model.train()
        running = 0.0
        for imgs, masks in train_loader:
            imgs = imgs.to(device, dtype=torch.float32)
            masks = masks.to(device, dtype=torch.float32)
            masks = (masks > 0.5).float()

            logits = model(imgs)
            # logits shape: [B,1,H,W], masks shape: [B,1,H,W]
            loss = criterion(logits, masks)
            opt.zero_grad()
            loss.backward()
            opt.step()
            running += loss.item() * imgs.size(0)

        epoch_loss = running / len(ds)
        print(f"Epoch {epoch+1}/{args.epochs} - train loss: {epoch_loss:.4f}")

        # validation (simple)
        model.eval()
        vrun = 0.0
        # metrics accumulators for barnacle-style KPIs
        total_cracas_pred = 0
        total_cracas_gt = 0
        total_fouling_cm2_pred = 0.0
        total_fouling_cm2_gt = 0.0
        total_pixels = 0
        with torch.no_grad():
            for imgs, masks in val_loader:
                imgs = imgs.to(device, dtype=torch.float32)
                masks = masks.to(device, dtype=torch.float32)
                masks = (masks > 0.5).float()
                logits = model(imgs)
                loss = criterion(logits, masks)
                vrun += loss.item() * imgs.size(0)

                # compute barnacle KPIs on predictions and ground truth
                probs = torch.sigmoid(logits).cpu().numpy()
                preds = (probs > 0.5).astype(np.uint8)  # B,1,H,W
                gts = masks.cpu().numpy().astype(np.uint8)

                B = preds.shape[0]
                for i in range(B):
                    pred_mask = preds[i, 0]
                    gt_mask = gts[i, 0]
                    # count cracas and area
                    cr_pred, fouling_px_pred, fouling_cm2_pred = count_cracas_from_mask(pred_mask, cm2_per_pixel=0.0025, area_px_min=20, area_px_max=2000)
                    cr_gt, fouling_px_gt, fouling_cm2_gt = count_cracas_from_mask(gt_mask, cm2_per_pixel=0.0025, area_px_min=20, area_px_max=2000)
                    total_cracas_pred += cr_pred
                    total_cracas_gt += cr_gt
                    total_fouling_cm2_pred += fouling_cm2_pred
                    total_fouling_cm2_gt += fouling_cm2_gt
                    total_pixels += pred_mask.size
        vloss = vrun / len(val_ds)
        print(f"  val loss: {vloss:.4f}")

        # print barnacle KPIs summary
        if total_pixels > 0:
            coverage_pred = (total_fouling_cm2_pred / (total_pixels * 1.0)) * 100.0  # cm2 per pixel used inconsistently here, approximate
        else:
            coverage_pred = 0.0
        print(f"  Val KPIs — cracas_pred: {total_cracas_pred}, cracas_gt: {total_cracas_gt}, fouling_cm2_pred: {total_fouling_cm2_pred:.3f}, fouling_cm2_gt: {total_fouling_cm2_gt:.3f}")

        if vloss < best_loss:
            best_loss = vloss
            Path(args.save_dir).mkdir(parents=True, exist_ok=True)
            out_path = Path(args.save_dir) / f"unet_best.pth"
            torch.save({'model_state': model.state_dict(), 'args': vars(args)}, out_path)
            print("  Saved best model ->", out_path)


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--coco', type=str, help='COCO annotations JSON (optional)')
    p.add_argument('--images', type=str, required=True, help='Folder with images (train)')
    p.add_argument('--out_masks', type=str, required=True, help='Where to save masks')
    p.add_argument('--epochs', type=int, default=5)
    p.add_argument('--batch_size', type=int, default=4)
    p.add_argument('--lr', type=float, default=1e-3)
    p.add_argument('--size', nargs=2, type=int, default=[256,256])
    p.add_argument('--use_freq', action='store_true', help='Append frequency channel')
    p.add_argument('--save_dir', type=str, default='models')
    p.add_argument('--force_masks', action='store_true', help='Force regeneration of masks')
    return p.parse_args()


if __name__ == '__main__':
    args = parse_args()
    train(args)
