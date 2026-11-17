import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { env } from '../../config/env.js';

const encryptionKey = createHash('sha256').update(`encryption:${env.AUTH_SECRET}`).digest();
const signingKey = createHash('sha256').update(`signing:${env.AUTH_SECRET}`).digest();
const AUTH_TAG_BYTES = 16;

export const encrypt = (plaintext: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

  return ['v1', iv, cipher.getAuthTag(), encrypted]
    .map((part) => (typeof part === 'string' ? part : part.toString('base64url')))
    .join('.');
};

export const decrypt = (payload: string) => {
  const [version, iv, tag, encrypted] = payload.split('.');

  if (version !== 'v1' || !iv || !tag || !encrypted) {
    throw new Error('Unsupported encrypted payload');
  }

  // Pinning the tag length rejects truncated tags, which would weaken the integrity check.
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey, Buffer.from(iv, 'base64url'), {
    authTagLength: AUTH_TAG_BYTES,
  });
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
};

export const sign = (value: string) =>
  `${value}.${createHmac('sha256', signingKey).update(value).digest('base64url')}`;

export const unsign = (signed: string) => {
  const separator = signed.lastIndexOf('.');
  const value = signed.slice(0, separator);
  const expected = Buffer.from(sign(value));
  const actual = Buffer.from(signed);

  return separator > 0 && expected.length === actual.length && timingSafeEqual(expected, actual)
    ? value
    : undefined;
};

export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
