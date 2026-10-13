// Access token de la API (SDD S1.3 §2.6). Vive solo en memoria, nunca en
// localStorage: un XSS no lo puede leer después. Al recargar se pierde; S1.10
// lo recupera con el refresh de la cookie httpOnly.

let accessToken: string | null = null;

export const guardarAccessToken = (token: string): void => {
  accessToken = token;
};

export const obtenerAccessToken = (): string | null => accessToken;

export const borrarAccessToken = (): void => {
  accessToken = null;
};
