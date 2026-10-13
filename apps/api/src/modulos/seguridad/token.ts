import { createHash } from 'node:crypto';

/** SHA-256 en hexadecimal (64 caracteres). Es lo único que se guarda del refresh token (SDD S1.1 §2.4). */
export const hashDeToken = (token: string): string => createHash('sha256').update(token).digest('hex');
