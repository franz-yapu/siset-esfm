import type { DetailedHTMLProps, HTMLAttributes } from 'react';

// El web component del captcha (ADR-0012) en JSX: React 19 le pasa `challenge` y `language` como propiedades.
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'altcha-widget': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        challenge?: string;
        language?: string;
      };
    }
  }
}
