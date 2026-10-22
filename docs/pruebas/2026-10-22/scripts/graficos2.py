import json
from PIL import Image, ImageDraw, ImageFont
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 10, 'axes.spines.top': False, 'axes.spines.right': False})
AZ, CE, RO = '#1F4E79', '#2E75B6', '#C0392B'
fb = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
# Mosaico: 3 navegadores x 3 tamaños, pantalla lista de files
nav = [('chromium', 'Chromium'), ('chrome', 'Google Chrome'), ('firefox', 'Firefox')]
tam = [('escritorio', 'Escritorio 1366×768'), ('tablet', 'Tablet 820×1180'), ('celular', 'Celular 360×800')]
H = 520; cols = []
for t, _ in tam:
    im = Image.open(f'compat/chromium-{t}-files.png'); cols.append(int(im.width * H / im.height))
W = sum(cols) + 40 * 4; canvas = Image.new('RGB', (W + 180, 60 + (H + 40) * 3), 'white'); d = ImageDraw.Draw(canvas)
x = 180
for (t, tl), cw in zip(tam, cols): d.text((x, 15), tl, font=fb, fill=AZ); x += cw + 40
for r, (n, nl) in enumerate(nav):
    y = 60 + r * (H + 40); d.text((10, y + H // 2 - 12), nl, font=fb, fill=AZ); x = 180
    for (t, _), cw in zip(tam, cols):
        im = Image.open(f'compat/{n}-{t}-files.png').convert('RGB').resize((cw, H)); canvas.paste(im, (x, y)); d.rectangle([x, y, x + cw, y + H], outline='#9DB3C8', width=2); x += cw + 40
canvas.save('img/compat-mosaico.png')
# Mosaico 2: detalle de file y seguimiento en celular (3 navegadores)
ims = [Image.open(f'compat/{n}-celular-{p}.png').convert('RGB') for n, _ in nav for p in ('detalle', 'seguimiento')]
w0, h0 = ims[0].size; c2 = Image.new('RGB', (6 * (w0 + 20) + 20, h0 + 70), 'white'); d = ImageDraw.Draw(c2)
for i, im in enumerate(ims):
    c2.paste(im.resize((w0, h0)), (20 + i * (w0 + 20), 60)); d.text((20 + i * (w0 + 20), 15), f"{nav[i // 2][1]} · {'detalle' if i % 2 == 0 else 'seguimiento'}", font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16), fill=AZ)
c2.save('img/compat-celular.png')
# Antes / después del estrés
def tramos(f):
    L = [l.split() for l in open(f).read().strip().split('\n')[1:]]
    return [int(x[1]) for x in L], [float(x[2]) for x in L], [int(x[3]) for x in L], [int(x[4]) for x in L]
a, b = tramos('estres-tramos.txt'), tramos('estres2-tramos.txt')
fig, axs = plt.subplots(1, 3, figsize=(12, 3.8))
for ax, k, tit, u in [(axs[0], 1, '% de peticiones fallidas', '%'), (axs[1], 2, 'Peticiones por segundo', 'req/s'), (axs[2], 3, 'p95 de respuestas correctas', 'ms')]:
    ax.plot(range(len(a[0])), a[k], marker='o', ms=3, color=RO, label='Antes (sin keepalive)')
    ax.plot(range(len(b[0])), b[k], marker='o', ms=3, color=CE, label='Después (keepalive 64)')
    ax.set_title(tit, loc='left', fontsize=11); ax.set_ylabel(u)
    ax.set_xticks(range(0, len(b[0]), 2)); ax.set_xticklabels([str(v) for v in b[0][::2]], fontsize=8); ax.set_xlabel('usuarios simultáneos (cada 30 s)')
axs[0].legend(frameon=False); fig.suptitle('Prueba de estrés hasta 400 usuarios: antes y después de la corrección en Nginx', x=0.01, ha='left', fontsize=12)
fig.tight_layout(); fig.savefig('img/estres-antes-despues.png', dpi=150)
