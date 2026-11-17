import { z } from 'zod';

const FORBIDDEN_CHARACTERS = /[\p{Cc}\p{Cs}\p{Zl}\p{Zp}\p{Bidi_Control}]/u;
const VISIBLE_CHARACTER = /[\p{L}\p{N}\p{P}\p{S}]/u;
const SKU_PATTERN = /^[A-Z0-9А-ЯЁІЇЄҐ][A-Z0-9А-ЯЁІЇЄҐ._/-]*$/;

export const MAX_PRICE_MINOR = 99_999_999;
export const MAX_STOCK_QUANTITY = 1_000_000;

const normalizeUnicode = (value: string) => value.normalize('NFC');

export const text = (max: number) =>
  z
    .string()
    .overwrite(normalizeUnicode)
    .trim()
    .min(1)
    .max(max)
    .refine((value) => !FORBIDDEN_CHARACTERS.test(value), 'Must not contain control characters')
    .refine((value) => VISIBLE_CHARACTER.test(value), 'Must contain visible characters');

export const multilineText = (max: number) =>
  z
    .string()
    .transform((value) => normalizeUnicode(value).replace(/\r\n?/g, '\n').trim())
    .pipe(
      z
        .string()
        .min(1)
        .max(max)
        .refine(
          (value) => !FORBIDDEN_CHARACTERS.test(value.replace(/[\n\t]/g, ' ')),
          'Must not contain control characters',
        )
        .refine((value) => VISIBLE_CHARACTER.test(value), 'Must contain visible characters'),
    );

export const priceMinor = z.number().int().min(1).max(MAX_PRICE_MINOR);

export const costPriceMinor = z.number().int().min(0).max(MAX_PRICE_MINOR);

export const sku = z
  .string()
  .overwrite(normalizeUnicode)
  .trim()
  .toUpperCase()
  .min(1)
  .max(64)
  .regex(SKU_PATTERN, 'Use letters, digits and . _ / - (must start with a letter or digit)');

export const position = z.number().int().min(0).max(1_000_000);

const E164_PATTERN = /^\+[1-9]\d{6,14}$/;
const UKRAINIAN_TRUNK_ZERO = /^\s*(?:\+|00)\s*38\s*\(0\)/;

export const email = z.string().trim().toLowerCase().max(254).pipe(z.email());

export const phone = z
  .string()
  .refine(
    (value) => !value.includes('(0)') || UKRAINIAN_TRUNK_ZERO.test(value),
    'Remove the "(0)" trunk prefix',
  )
  .transform((value) => value.replace(/[\s().-]/g, '').replace(/^00/, '+'))
  .pipe(
    z
      .string()
      .regex(E164_PATTERN, 'Use international format with country code, e.g. +380501234567'),
  );

export const uuid = z.uuid().transform((value) => value.toLowerCase());

export const nonEmptyPatch = (value: Record<string, unknown>) => Object.keys(value).length > 0;
