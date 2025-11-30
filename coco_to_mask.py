"""coco_to_mask.py
Converter anotações COCO para máscaras PNG (uma máscara por imagem).

Requisitos:
  pip install pycocotools pillow numpy

Uso:
  python project/src/vision/coco_to_mask.py --coco ../Barnacle\ population.v10i.coco/_annotations.coco.json --images ../Barnacle\ population.v10i.coco/train --outdir data/vision/masks
"""
from __future__ import annotations
import argparse
from pathlib import Path
import numpy as np
from PIL import Image

try:
    from pycocotools.coco import COCO
    from pycocotools import mask as mask_utils
except Exception as e:
    raise ImportError(
        "pycocotools is required. Install with: pip install pycocotools"
    ) from e


def ensure_dir(p: Path):
    p.mkdir(parents=True, exist_ok=True)


def coco_to_masks(coco_json: str, images_dir: str, out_dir: str, classes_of_interest: list[int] | None = None):
    coco = COCO(coco_json)
    ensure_dir(Path(out_dir))

    img_ids = coco.getImgIds()
    for img_id in img_ids:
        img_info = coco.loadImgs(img_id)[0]
        file_name = img_info["file_name"]
        img_path = Path(images_dir) / file_name
        if not img_path.exists():
            print(f"Aviso: imagem não encontrada {img_path}, pulando")
            continue

        height, width = img_info.get("height"), img_info.get("width")
        mask = np.zeros((height, width), dtype=np.uint8)

        ann_ids = coco.getAnnIds(imgIds=img_id)
        anns = coco.loadAnns(ann_ids)
        for ann in anns:
            cat_id = ann.get("category_id")
            if classes_of_interest and cat_id not in classes_of_interest:
                continue
            # rle or segmentation
            seg = ann.get("segmentation")
            if seg is None:
                continue
            rle = mask_utils.frPyObjects(seg, height, width)
            m = mask_utils.decode(rle)
            if m.ndim == 3:
                m = np.any(m, axis=2)
            # set mask pixels to 1 (or category id if multiple classes desired)
            mask[m > 0] = 1

        out_mask_path = Path(out_dir) / f"{Path(file_name).stem}_mask.png"
        Image.fromarray((mask * 255).astype(np.uint8)).save(out_mask_path)
        print(f"Salvo máscara: {out_mask_path}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--coco", required=True, help="Caminho para o JSON COCO annotations")
    parser.add_argument("--images", required=True, help="Pasta com imagens correspondentes")
    parser.add_argument("--outdir", required=True, help="Pasta de saída para máscaras PNG")
    parser.add_argument("--classes", nargs="*", type=int, help="IDs de categorias para incluir (opcional)")
    args = parser.parse_args()

    coco_to_masks(args.coco, args.images, args.outdir, classes_of_interest=args.classes)


if __name__ == "__main__":
    main()
"""
Converte anotações COCO (arquivo JSON) em máscaras PNG binárias.
Uso:
    python src/vision/coco_to_mask.py --coco_json path/to/_annotations.coco.json --images_dir path/to/images --out_dir data/vision/train/masks

Assume que cada anotação contém `image_id` e `segmentation` no formato 'polygon' ou RLE.
"""
import os
import argparse
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from pycocotools import mask as maskUtils


def polygon_to_mask(polygons, height, width):
    mask = Image.new('L', (width, height), 0)
    draw = ImageDraw.Draw(mask)
    for poly in polygons:
        xy = [(poly[i], poly[i+1]) for i in range(0, len(poly), 2)]
        draw.polygon(xy, outline=1, fill=1)
    return np.array(mask, dtype=np.uint8)


def rle_to_mask(rle, height, width):
    m = maskUtils.decode(rle)
    return m.astype(np.uint8)


def convert(coco_json, images_dir, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    with open(coco_json, 'r') as f:
        coco = json.load(f)
    images = {img['id']: img for img in coco.get('images', [])}
    anns = coco.get('annotations', [])

    # agrupar por image_id
    grouped = {}
    for a in anns:
        grouped.setdefault(a['image_id'], []).append(a)

    for img_id, annotations in grouped.items():
        img_info = images[img_id]
        h, w = img_info['height'], img_info['width']
        mask = np.zeros((h,w), dtype=np.uint8)
        for a in annotations:
            seg = a.get('segmentation')
            if isinstance(seg, list):
                m = polygon_to_mask(seg, h, w)
            else:
                # RLE
                m = rle_to_mask(a['segmentation'], h, w)
            mask = np.maximum(mask, m)
        out_name = Path(img_info['file_name']).stem + '.png'
        Image.fromarray((mask*255).astype('uint8')).save(os.path.join(out_dir, out_name))
    print('Conversão concluída.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--coco_json', required=True)
    parser.add_argument('--images_dir', required=False)
    parser.add_argument('--out_dir', required=True)
    args = parser.parse_args()
    convert(args.coco_json, args.images_dir, args.out_dir)
