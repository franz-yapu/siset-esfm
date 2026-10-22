import json, csv
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 10, 'axes.spines.top': False, 'axes.spines.right': False})
AZ, CE = '#1F4E79', '#2E75B6'
# 1) Tiempos por endpoint (carga)
e = json.load(open('carga-endpoints.json')); e = [x for x in e if x[0] != 'POST /auth/login']
e.sort(key=lambda x: x[4])
fig, ax = plt.subplots(figsize=(9, 4.2))
y = range(len(e))
ax.barh([i + .2 for i in y], [x[2] for x in e], .4, color=CE, label='Promedio')
ax.barh([i - .2 for i in y], [x[4] for x in e], .4, color=AZ, label='Percentil 95')
for i, x in enumerate(e): ax.text(x[4] + .2, i - .2, f'{x[4]:.1f} ms', va='center', fontsize=8)
ax.set_yticks(list(y)); ax.set_yticklabels([x[0] for x in e]); ax.set_xlabel('milisegundos')
ax.set_title('Tiempo de respuesta por operación — carga con 50 usuarios (4 088 peticiones c/u)', loc='left', fontsize=11)
ax.legend(frameon=False, loc='lower right'); fig.tight_layout(); fig.savefig('img/carga-endpoints.png', dpi=150)
# 2) Disponibilidad del servidor de prueba
r = list(csv.DictReader(open('disponibilidad.csv')))
fig, ax = plt.subplots(figsize=(9, 3.4))
for u, c, n in [('https://siset.vertexall.com/', CE, 'Página web'), ('https://siset.vertexall.com/api/v1/health', AZ, 'API /health')]:
    d = [x for x in r if x['url'] == u]
    ax.plot([x['hora'][:5] + x['hora'][5:] for x in d], [1000 * float(x['segundos']) for x in d], marker='o', ms=3, color=c, label=f'{n} ({sum(x["codigo"]=="200" for x in d)}/{len(d)} respuestas 200)')
ax.set_ylim(0, 800); ax.set_ylabel('ms'); ax.set_xticks(ax.get_xticks()[::6])
ax.set_title('Disponibilidad de siset.vertexall.com — sondeo cada 15 s (22-oct-2026)', loc='left', fontsize=11)
ax.legend(frameon=False, loc='lower right'); fig.tight_layout(); fig.savefig('img/disponibilidad.png', dpi=150)
# 3) Matriz de riesgos
R = json.load(open('riesgos.json'))
import numpy as np
fig, ax = plt.subplots(figsize=(7.5, 5.6))
col = np.zeros((5, 5, 3))
for p in range(1, 6):
    for i in range(1, 6):
        v = p * i; col[p - 1, i - 1] = (0.85, 0.94, 0.85) if v <= 6 else ((1, 0.93, 0.7) if v <= 12 else (0.98, 0.78, 0.76))
ax.imshow(col, origin='lower', extent=(0.5, 5.5, 0.5, 5.5))
cel = {}
for x in R: cel.setdefault((x['p'], x['i']), []).append(x['id'])
for (p, i), ids in cel.items(): ax.text(i, p, '\n'.join(', '.join(ids[k:k+2]) for k in range(0, len(ids), 2)), ha='center', va='center', fontsize=9, fontweight='bold', color='#222')
ax.set_xticks(range(1, 6)); ax.set_yticks(range(1, 6)); ax.set_xlabel('Impacto (1 = mínimo, 5 = crítico)'); ax.set_ylabel('Probabilidad (1 = rara, 5 = casi segura)')
ax.set_title('Matriz de riesgos (Riesgo = Probabilidad × Impacto)', loc='left', fontsize=11)
for s in ax.spines.values(): s.set_visible(False)
fig.tight_layout(); fig.savefig('img/matriz-riesgos.png', dpi=150)
