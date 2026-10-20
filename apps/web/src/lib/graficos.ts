import {
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Filler,
} from 'chart.js';

Chart.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler);
Chart.defaults.font.family = "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif";
// Gráficos sin adornos (tasteskill, app screens §6): texto gris legible, grilla tenue, sin borde de ejes.
Chart.defaults.color = '#525c69';
Chart.defaults.borderColor = '#e5e8ec';

/** El dato principal de cada gráfico va en el azul institucional; lo secundario, en gris. */
export const AZUL = '#1F4E79';
export const AZUL_OSCURO = '#173B5C';
