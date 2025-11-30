"""Utilities for image preprocessing, FFT frequency filtering and mask conversion.

Functions:
 - apply_frequency_bandpass: apply band-pass filter in frequency domain
 - coco_annotations_to_masks: convert COCO annotations JSON to binary masks (requires pycocotools)
 - compute_fouling_from_mask: simple fouling metric from binary mask

Usage: import these functions from training/inference scripts.
"""
from __future__ import annotations

import os
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw

try:
    from pycocotools import mask as maskUtils
    from pycocotools.coco import COCO
except Exception:
    COCO = None
    maskUtils = None


def apply_frequency_bandpass(img: np.ndarray, low_ratio: float = 0.01, high_ratio: float = 0.5) -> np.ndarray:
    """Apply a simple band-pass filter in the frequency domain to enhance textures.

    img: uint8 grayscale or color (H,W) or (H,W,3)
    low_ratio, high_ratio: relative frequencies (0..0.5), low < high

    Returns filtered image (same shape, float32 normalized 0..255)
    """
    if img.ndim == 3:
        # apply per-channel
        chans = [apply_frequency_bandpass(img[..., c], low_ratio, high_ratio) for c in range(img.shape[2])]
        return np.stack(chans, axis=-1)

    # grayscale (H,W)
    imf = np.fft.fft2(img)
    imfshift = np.fft.fftshift(imf)

    h, w = img.shape
    cy, cx = h // 2, w // 2
    # create mask
    Y, X = np.ogrid[:h, :w]
    dist = np.sqrt((Y - cy) ** 2 + (X - cx) ** 2)
    max_dist = np.sqrt((cy) ** 2 + (cx) ** 2)
    low = low_ratio * max_dist
    high = high_ratio * max_dist
    mask = (dist >= low) & (dist <= high)

    imfshift_filtered = imfshift * mask
    imf_ifft = np.fft.ifftshift(imfshift_filtered)
    img_back = np.fft.ifft2(imf_ifft)
    img_back = np.real(img_back)

    # normalize to 0..255
    mn, mx = img_back.min(), img_back.max()
    if mx - mn < 1e-6:
        out = np.clip(img.astype(np.float32), 0, 255)
    else:
        out = 255.0 * (img_back - mn) / (mx - mn)

    return out.astype(np.float32)


def coco_annotations_to_masks(coco_json_path: str, images_dir: str, out_dir: str, size: tuple | None = None):
    """Convert COCO annotations to binary masks saved as PNG files.

    - coco_json_path: path to _annotations.coco.json
    - images_dir: folder with images (file_name in COCO)
    - out_dir: where to save masks (one mask per image named <stem>_mask.png)
    - size: optional (w,h) to resize masks/images

    Requires pycocotools.
    """
    if COCO is None or maskUtils is None:
        raise ImportError("pycocotools is required. pip install pycocotools")

    coco = COCO(coco_json_path)
    Path(out_dir).mkdir(parents=True, exist_ok=True)

    img_ids = coco.getImgIds()
    for img_id in img_ids:
        img_info = coco.loadImgs(img_id)[0]
        file_name = img_info["file_name"]
        anns_ids = coco.getAnnIds(imgIds=img_id)
        anns = coco.loadAnns(anns_ids)

        h = img_info.get("height") or 0
        w = img_info.get("width") or 0
        if h == 0 or w == 0:
            # try opening file
            p = Path(images_dir) / file_name
            with Image.open(p) as im:
                w, h = im.size

        mask = np.zeros((h, w), dtype=np.uint8)

        for a in anns:
            seg = a.get("segmentation")
            if seg is None:
                rle = a.get("segmentation")
                if rle:
                    m = maskUtils.decode(rle)
                    mask = np.maximum(mask, m.astype(np.uint8))
                continue

            # segmentation can be list of polygons
            if isinstance(seg, list):
                for poly in seg:
                    xy = [(poly[i], poly[i + 1]) for i in range(0, len(poly), 2)]
                    img = Image.new("L", (w, h), 0)
                    ImageDraw.Draw(img).polygon(xy, outline=1, fill=1)
                    mask = np.maximum(mask, np.array(img, dtype=np.uint8))
            else:
                # rle
                try:
                    m = maskUtils.decode(seg)
                    mask = np.maximum(mask, m.astype(np.uint8))
                except Exception:
                    continue

        out_name = Path(file_name).stem + "_mask.png"
        out_path = Path(out_dir) / out_name
        mimg = Image.fromarray((mask * 255).astype('uint8'))
        if size is not None:
            mimg = mimg.resize(size, resample=Image.NEAREST)
        mimg.save(out_path)


def compute_fouling_from_mask(mask: np.ndarray) -> float:
    """Compute a simple fouling index as fraction of mask area (0..1)."""
    if mask.dtype != np.uint8 and mask.dtype != np.bool_:
        mask = (mask > 0).astype(np.uint8)
    total = mask.size
    if total == 0:
        return 0.0
    return float(mask.sum() / total)


if __name__ == "__main__":
    print("vision_utils.py: helper module. Import functions from your scripts.")
