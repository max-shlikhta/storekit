import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const COST = 2 ** 17;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const KEY_LENGTH = 64;
const MAX_MEMORY = 256 * 1024 * 1024;

const derive = (
  password: string,
  salt: Buffer,
  cost: number,
  blockSize: number,
  parallelization: number,
) =>
  new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      KEY_LENGTH,
      { N: cost, r: blockSize, p: parallelization, maxmem: MAX_MEMORY },
      (error, key) => {
        if (error) {
          reject(error);
        } else {
          resolve(key);
        }
      },
    );
  });

export const hashPassword = async (password: string) => {
  const salt = randomBytes(16);
  const key = await derive(password, salt, COST, BLOCK_SIZE, PARALLELIZATION);

  return [
    'scrypt',
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString('base64url'),
    key.toString('base64url'),
  ].join('$');
};

export const verifyPassword = async (password: string, stored: string | null) => {
  const [algorithm, cost, blockSize, parallelization, salt, expected] = (stored ?? '').split('$');

  if (algorithm !== 'scrypt' || !salt || !expected) {
    return false;
  }

  const key = await derive(
    password,
    Buffer.from(salt, 'base64url'),
    Number(cost),
    Number(blockSize),
    Number(parallelization),
  );
  const expectedKey = Buffer.from(expected, 'base64url');

  return key.length === expectedKey.length && timingSafeEqual(key, expectedKey);
};
