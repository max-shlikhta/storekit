import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatMoney, parseMoney, toMajor } from './format.ts';

describe('money formatting', () => {
  it('formats minor units in the store currency', () => {
    assert.equal(formatMoney(123456, 'USD'), '$1,234.56');
  });

  it('parses what people type, with a dot or a comma', () => {
    assert.equal(parseMoney('12.50'), 1250);
    assert.equal(parseMoney('12,5'), 1250);
    assert.equal(parseMoney(' 7 '), 700);
  });

  it('reads digits exactly, with no float noise', () => {
    assert.equal(parseMoney('0.29'), 29);
    assert.equal(parseMoney('1.1'), 110);
    assert.equal(parseMoney('19.99'), 1999);
  });

  it('refuses fractions of a cent instead of guessing a rounding', () => {
    assert.equal(parseMoney('1.005'), null);
  });

  it('rejects anything that is not a non-negative number', () => {
    for (const text of ['', 'abc', '-1', '1e999', '1.2.3', '12.']) {
      assert.equal(parseMoney(text), null, text);
    }
  });

  it('prints minor units as an editable major amount', () => {
    assert.equal(toMajor(1250), '12.50');
  });
});
