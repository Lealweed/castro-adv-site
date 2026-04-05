// src/lib/crypto.ts
// Utilitário para hash seguro de portal_pin compatível com navegador.
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getWebCrypto(): Crypto {
  const webCrypto = globalThis.crypto;
  if (!webCrypto?.subtle) {
    throw new Error('Web Crypto indisponível neste ambiente.');
  }
  return webCrypto;
}

async function sha256Hex(input: string): Promise<string> {
  const cryptoApi = getWebCrypto();
  const payload = new TextEncoder().encode(input);
  const digest = await cryptoApi.subtle.digest('SHA-256', payload);
  return bytesToHex(new Uint8Array(digest));
}

export async function hashPortalPin(pin: string): Promise<string> {
  const cryptoApi = getWebCrypto();
  const saltBytes = new Uint8Array(8);
  cryptoApi.getRandomValues(saltBytes);
  const salt = bytesToHex(saltBytes);
  const hash = await sha256Hex(`${salt}${pin}`);
  return `${salt}$${hash}`;
}

export async function verifyPortalPin(pin: string, hashWithSalt: string): Promise<boolean> {
  const [salt, hash] = hashWithSalt.split('$');
  if (!salt || !hash) return false;
  const check = await sha256Hex(`${salt}${pin}`);
  return check === hash;
}
