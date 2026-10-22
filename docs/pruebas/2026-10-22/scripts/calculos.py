import json
K = (6545 + 19815 + 714) / 1000  # KLOC de código fuente (sin pruebas ni código generado)
a, b, c, d = 2.4, 1.05, 2.5, 0.38
E = a * K ** b; T = c * E ** d; P = E / T
sal = 6000; costo = E * sal
# Económico (supuestos marcados en el informe)
I0 = 2 * 2 * 4000 + 1000  # 2 desarrolladores x 2 meses x Bs 4.000 + Bs 1.000 capacitación y materiales
cost_anual = 70 * 12 + 100 + 12 * 8 * 50  # VPS + dominio + mantenimiento 8 h/mes a Bs 50
ben_anual = 4 * 5 * 40 * 25 + 2000  # 4 funcionarios x 5 h/semana x 40 semanas x Bs 25/h + papel y fotocopias
tasa, n = 0.10, 5
flujo = ben_anual - cost_anual
fd = [(1 + tasa) ** -t for t in range(1, n + 1)]
VAN = -I0 + sum(flujo * f for f in fd)
def van(r): return -I0 + sum(flujo / (1 + r) ** t for t in range(1, n + 1))
lo, hi = 0.0, 10.0
for _ in range(200):
    m = (lo + hi) / 2
    (lo, hi) = (m, hi) if van(m) > 0 else (lo, m)
TIR = (lo + hi) / 2
BC = sum(ben_anual * f for f in fd) / (I0 + sum(cost_anual * f for f in fd))
rec = I0 / flujo * 12
R = dict(KLOC=round(K, 3), E=E, T=T, P=P, sal=sal, costo=costo, I0=I0, cost_anual=cost_anual, ben_anual=ben_anual, flujo=flujo, tasa=tasa, n=n, VAN=VAN, TIR=TIR, BC=BC, rec_meses=rec, fd=fd)
json.dump(R, open('calculos.json', 'w'), indent=1); print(json.dumps({k: (round(v, 2) if isinstance(v, float) else v) for k, v in R.items() if k != 'fd'}, indent=0))
