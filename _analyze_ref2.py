#!/usr/bin/env python3
"""Detailed analysis of reference dashboard screenshot."""

from PIL import Image

img = Image.open("docs/reference-dashboard.png")
w, h = img.size

print("=== HERO SECTION (y=100-200) ===")
for y in range(100, 200, 10):
    row = []
    for x in range(50, 750, 50):
        px = img.getpixel((x, y))[:3]
        row.append(str(px))
    print(f"y={y}: {' | '.join(row)}")

print("\n=== FEATURE CARDS (y=250-400) ===")
for y in range(250, 400, 15):
    row = []
    for x in range(50, 750, 50):
        px = img.getpixel((x, y))[:3]
        row.append(str(px))
    print(f"y={y}: {' | '.join(row)}")

print("\n=== STATS SECTION (y=420-500) ===")
for y in range(420, 500, 10):
    row = []
    for x in range(50, 750, 50):
        px = img.getpixel((x, y))[:3]
        row.append(str(px))
    print(f"y={y}: {' | '.join(row)}")

# Count unique-ish colors
print("\n=== COLOR SUMMARY ===")
from collections import Counter

color_counts = Counter()
for y in range(0, h, 8):
    for x in range(0, w, 8):
        px = img.getpixel((x, y))[:3]
        # Bucket colors
        bucket = (px[0] // 32 * 32, px[1] // 32 * 32, px[2] // 32 * 32)
        color_counts[bucket] += 1

print("Top 20 color buckets:")
for color, count in color_counts.most_common(20):
    print(f"  rgb{color}: {count} pixels ({100 * count / sum(color_counts.values()):.1f}%)")
