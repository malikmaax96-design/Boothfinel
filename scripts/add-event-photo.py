#!/usr/bin/env python3
"""Process one event photo for the site and register it in data/images.json.

Usage: python3 -I scripts/add-event-photo.py <source-image> <name>

Writes images/<name>.webp, <name>-480.webp, <name>-opt.jpg and <name>-480.jpg,
applies the EXIF orientation and drops all metadata (including GPS location),
then records the intrinsic sizes in data/images.json. Needs Pillow; the normal
site build (scripts/build-pages.js) does not.
"""
import json
import os
import sys

from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAX_EDGE = 1200   # longest edge of the large variant
SMALL_W = 480     # width of the small variant


def main(src, name):
    im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')  # fixes rotation; convert() drops EXIF
    w, h = im.size
    scale = min(1.0, MAX_EDGE / max(w, h))
    big = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS) if scale < 1 else im
    small = big.resize((SMALL_W, round(big.size[1] * SMALL_W / big.size[0])), Image.LANCZOS) if big.size[0] > SMALL_W else big
    out = os.path.join(ROOT, 'images')
    big.save(f'{out}/{name}.webp', quality=78, method=6)
    small.save(f'{out}/{name}-480.webp', quality=75, method=6)
    big.save(f'{out}/{name}-opt.jpg', quality=80, optimize=True, progressive=True)
    small.save(f'{out}/{name}-480.jpg', quality=78, optimize=True, progressive=True)
    path = os.path.join(ROOT, 'data', 'images.json')
    data = json.load(open(path))
    data[name] = {'w': big.size[0], 'h': big.size[1], 'sw': small.size[0], 'sh': small.size[1]}
    json.dump(data, open(path, 'w'), indent=2)
    print(name, data[name])


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
