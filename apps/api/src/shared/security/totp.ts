import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;
const WINDOW = 1;

export const toBase32 = (data: Buffer) => {
  let bits = '';

  for (const byte of data) {
    bits += byte.toString(2).padStart(8, '0');
  }

  return (bits.match(/.{1,5}/g) ?? [])
    .map((chunk) => BASE32_ALPHABET[Number.parseInt(chunk.padEnd(5, '0'), 2)])
    .join('');
};

const fromBase32 = (value: string) => {
  const normalized = value.replace(/=+$/, '').toUpperCase();
  const bits = Array.from({ length: normalized.length }, (_, index) =>
    BASE32_ALPHABET.indexOf(normalized.charAt(index)).toString(2).padStart(5, '0'),
  ).join('');

  return Buffer.from((bits.match(/.{8}/g) ?? []).map((byte) => Number.parseInt(byte, 2)));
};

const normalizeCode = (code: string) => code.replace(/\s/g, '');

export const isTotpCode = (code: string) => /^\d{6}$/.test(normalizeCode(code));

export const generateTotpSecret = () => toBase32(randomBytes(20));

export const currentStep = (now = Date.now()) => Math.floor(now / 1000 / STEP_SECONDS);

export const totpCode = (secret: string, step: number) => {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));

  const digest = createHmac('sha1', fromBase32(secret)).update(counter).digest();
  const offset = (digest[digest.length - 1] ?? 0) & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;

  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
};

export const matchTotpStep = (secret: string, code: string, now = Date.now()) => {
  if (!isTotpCode(code)) {
    return undefined;
  }

  const normalized = normalizeCode(code);
  const step = currentStep(now);

  return [step - WINDOW, step, step + WINDOW].find((candidate) =>
    timingSafeEqual(Buffer.from(totpCode(secret, candidate)), Buffer.from(normalized)),
  );
};

export const totpUri = (secret: string, account: string, issuer: string) =>
  `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?${new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  }).toString()}`;
