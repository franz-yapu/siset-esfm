import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 10, 'axes.spines.top': False, 'axes.spines.right': False})
AZ, CE, AM = '#1F4E79', '#2E75B6', '#D68910'
m = [('Adecuación funcional', 99.04, 'i'), ('Eficiencia de desempeño (meta < 2 s)', 100, 'i'), ('Compatibilidad', 100, 'i'), ('Usabilidad (accesibilidad)', 99.33, 'i'),
     ('Fiabilidad (disponibilidad)', 100, 'i'), ('Seguridad (controles)', 83.33, 'i'), ('Mantenibilidad', 79.75, 'i'), ('Portabilidad', 100, 'i'),
     ('Recuperación de respaldos', 100, 's'), ('Accesos seguros', 91.87, 's'), ('Corrección de vulnerabilidades', 33.33, 's')]
fig, ax = plt.subplots(figsize=(10, 5.2))
y = list(range(len(m)))[::-1]
ax.barh(y, [x[1] for x in m], color=[(CE if x[2] == 'i' else AZ) if x[1] >= 70 else AM for x in m], height=.6)
for yi, x in zip(y, m): ax.text(x[1] + 1, yi, f'{x[1]:.2f} %', va='center', fontsize=9)
ax.set_yticks(y); ax.set_yticklabels([x[0] for x in m]); ax.set_xlim(0, 112); ax.axvline(70, color='#999', ls='--', lw=1); ax.text(70.5, -0.9, 'umbral 70 %', fontsize=8, color='#666')
ax.set_title('Métricas consolidadas de SISET — ISO/IEC 25010 (celeste) e ISO/IEC 27001 (azul)', loc='left', fontsize=11)
fig.tight_layout(); fig.savefig('img/consolidado.png', dpi=150)
