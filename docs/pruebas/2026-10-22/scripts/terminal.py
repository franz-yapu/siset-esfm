# Uso: python terminal.py entrada.txt salida.png "título"  → imagen tipo terminal del texto
import sys, re
from PIL import Image, ImageDraw, ImageFont
src, dst, titulo = sys.argv[1], sys.argv[2], sys.argv[3]
txt = re.sub(r'\x1b\[[0-9;]*[A-Za-z]', '', open(src, encoding='utf-8', errors='replace').read()).rstrip('\n').split('\n')
txt = [l.replace('\t', '    ')[:150] for l in txt][:90]
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 15)
fb = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
lh = 20; w = max(900, max(int(f.getlength(l)) for l in txt) + 40); h = 44 + lh * len(txt) + 20
im = Image.new('RGB', (w, h), '#1e1e1e'); d = ImageDraw.Draw(im)
d.rectangle([0, 0, w, 32], fill='#323233')
for i, c in enumerate(['#ff5f56', '#ffbd2e', '#27c93f']): d.ellipse([12 + i * 20, 10, 24 + i * 20, 22], fill=c)
d.text((80, 7), titulo, font=fb, fill='#cccccc')
for i, l in enumerate(txt):
    col = '#d4d4d4'
    if re.search(r'✓|OK\b|EXITOSA|passed|0 vulnerabilities', l): col = '#6ad46a'
    if re.search(r'✗|FALLA|failed|FALLIDA|Error', l) and not re.search(r'0 failed|failed\.*: 0', l): col = '#f07070'
    d.text((20, 44 + i * lh), l, font=f, fill=col)
im.save(dst)
