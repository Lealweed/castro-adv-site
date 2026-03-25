// src/lib/crypto.ts
// Utilitário para hash seguro de portal_pin
import { createHash, randomBytes } from 'crypto';

export function hashPortalPin(pin: string): string {
  const salt = randomBytes(8).toString('hex');
  const hash = createHash('sha256').update(salt + pin).digest('hex');
  return `${salt}$${hash}`;
}

export function verifyPortalPin(pin: string, hashWithSalt: string): boolean {
  const [salt, hash] = hashWithSalt.split('$');
  if (!salt || !hash) return false;
  const check = createHash('sha256').update(salt + pin).digest('hex');
  return check === hash;
}
