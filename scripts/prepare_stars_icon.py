"""Prepare the user's PNG for small UI icons (requires Pillow).

Keep public/IMG_0930.png unchanged. Remove its opaque white background and
use the largest connected shape (the star) without surrounding sparkles/margins.
Run from the repository root: python scripts/prepare_stars_icon.py
"""
from collections import deque
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
image = Image.open(root / 'public/IMG_0930.png').convert('RGBA')
pixels = image.load()
remaining = {
    (x, y) for y in range(image.height) for x in range(image.width)
    if pixels[x, y][:3] != (255, 255, 255) and pixels[x, y][3] > 0
}
largest = set()
while remaining:
    start = remaining.pop()
    component = {start}
    queue = deque([start])
    while queue:
        x, y = queue.popleft()
        for neighbor in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if neighbor in remaining:
                remaining.remove(neighbor)
                component.add(neighbor)
                queue.append(neighbor)
    if len(component) > len(largest):
        largest = component

if not largest:
    raise ValueError('Source image does not contain a star')
transparent = Image.new('RGBA', image.size)
for x, y in largest:
    transparent.putpixel((x, y), pixels[x, y])
star = transparent.crop(transparent.getbbox())
# Square canvas with a small safety margin; preserve the original aspect ratio.
side = max(star.size) + 8
icon = Image.new('RGBA', (side, side))
icon.paste(star, ((side - star.width) // 2, (side - star.height) // 2))
icon.save(root / 'public/telegram-stars.png', optimize=True)
