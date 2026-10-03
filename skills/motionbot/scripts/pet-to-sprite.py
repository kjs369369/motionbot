#!/usr/bin/env python3
"""Codex pet(pet.json + spritesheet.webp) → mbot 위젯용 축소 스프라이트 변환.

사용: python pet-to-sprite.py <pet 폴더> [출력.webp] [--height 120] [--cell 192x208]
  - 칸 격자(기본 192x208, Codex pet 표준)로 행별 프레임 수를 투명 칸 기준으로 계산한다.
  - 표시 높이(--height)의 약 1.08배 칸 높이로 축소해 WebP로 저장한다 (May Hero: 1.5MB → 약 230KB).
  - 끝에 위젯에 넣을 data- 속성을 출력한다.
필요: Pillow (pip install pillow)
"""
import json, sys, os, argparse
from PIL import Image

try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass

ap = argparse.ArgumentParser()
ap.add_argument('pet'); ap.add_argument('out', nargs='?')
ap.add_argument('--height', type=int, default=120, help='화면 표시 높이 px')
ap.add_argument('--cell', default='192x208', help='원본 칸 크기 WxH')
a = ap.parse_args()

meta = {}
mp = os.path.join(a.pet, 'pet.json')
if os.path.exists(mp):
    meta = json.load(open(mp, encoding='utf-8'))
sheet = os.path.join(a.pet, meta.get('spritesheetPath', 'spritesheet.webp'))
im = Image.open(sheet).convert('RGBA')
cw, ch = map(int, a.cell.split('x'))
cols, rows = im.width // cw, im.height // ch
if cols * cw != im.width or rows * ch != im.height:
    sys.exit(f'칸 크기 {cw}x{ch} 가 시트 {im.width}x{im.height} 와 맞지 않습니다. --cell 을 확인하세요.')

frames = []
for r in range(rows):
    n = 0
    for c in range(cols):
        if im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)).getbbox():
            n = c + 1
    frames.append(max(n, 1))

# 칸 높이 = 표시 높이 × 130/120 (May Hero 기준 비율, 화질 여유)
nh = round(a.height * 130 / 120)
nw = round(cw * nh / ch)
out = a.out or os.path.join(a.pet, (meta.get('id') or 'pet') + '.mbot.webp')
small = im.resize((cols * nw, rows * nh), Image.LANCZOS)
small.save(out, 'WEBP', quality=88, method=6)

states = 'idle,running-right,running-left,waving,jumping,failed,waiting,running,review'.split(',')
print(f'{sheet} {im.width}x{im.height} ({cols}x{rows}칸) → {out} {small.width}x{small.height}, {os.path.getsize(out) / 1024:.0f}KB')
print('행별 프레임:', ', '.join(f'{states[i] if i < len(states) else i}={n}' for i, n in enumerate(frames)))
print('\n위젯 속성:')
print(f'  data-sprite="/widgets/pets/{os.path.basename(out)}" data-sprite-cell="{nw}x{nh}" '
      f'data-sprite-frames="{",".join(map(str, frames))}" data-sprite-height="{a.height}"')
if rows != len(states):
    print(f'  주의: 행이 {rows}개입니다(표준 9개). 행 순서에 맞게 data-sprite-states 도 지정하세요.')
