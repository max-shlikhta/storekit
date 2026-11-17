'use client';

import { type SyntheticEvent, useMemo, useState } from 'react';
import { api, errorText } from '@/lib/api';
import { formatMoney, parseMoney } from '@/lib/format';
import { useStore } from '@/lib/session';
import type { ListEnvelope, ProductDto } from '@/lib/types';
import { useResource } from '@/lib/use-resource';
import { Button, ErrorNote, Field, Input, Select } from './ui';

type Line = { variantId: string; quantity: string };

export const NewOrderForm = ({ onCreated }: { onCreated: (orderId: string) => void }) => {
  const { store, base } = useStore();
  const products = useResource<ListEnvelope<ProductDto>>(
    `${base}/products?status=active&limit=100`,
  );
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [discount, setDiscount] = useState('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<Line[]>([{ variantId: '', quantity: '1' }]);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const variants = useMemo(
    () =>
      (products.data?.data ?? []).flatMap((product) =>
        product.variants
          .filter((variant) => variant.isActive)
          .map((variant) => ({ ...variant, label: `${product.title} · ${variant.title}` })),
      ),
    [products.data],
  );
  const subtotal = lines.reduce((sum, line) => {
    const variant = variants.find(({ id }) => id === line.variantId);
    return sum + (variant ? variant.priceMinor * (Number(line.quantity) || 0) : 0);
  }, 0);

  const updateLine = (index: number, patch: Partial<Line>) => {
    setLines((current) => current.map((line, at) => (at === index ? { ...line, ...patch } : line)));
  };

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);

    try {
      const discountMinor = discount === '' ? 0 : parseMoney(discount);

      if (discountMinor === null) {
        throw new Error('The discount is not a valid amount');
      }

      const { data } = await api<{ data: { id: string } }>(`${base}/orders`, {
        method: 'POST',
        body: {
          customer: { name, ...(phone && { phone }) },
          lines: lines
            .filter((line) => line.variantId)
            .map((line) => ({ variantId: line.variantId, quantity: Number(line.quantity) })),
          ...(discountMinor > 0 && { discountMinor }),
          ...(note && { note }),
        },
      });

      onCreated(data.id);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={(event) => void submit(event)}>
      <Field label="Customer name">
        <Input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
          required
        />
      </Field>
      <Field label="Phone (optional, e.g. +380501234567)">
        <Input
          type="tel"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
          }}
        />
      </Field>
      <div className="space-y-2">
        <span className="text-sm font-medium text-muted">Items</span>
        {lines.map((line, index) => (
          <div key={index} className="flex gap-2">
            <Select
              aria-label="Item"
              value={line.variantId}
              onChange={(event) => {
                updateLine(index, { variantId: event.target.value });
              }}
              required
            >
              <option value="">Choose an item…</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.label} · {formatMoney(variant.priceMinor, store.currency)} ·{' '}
                  {variant.stockOnHand} in stock
                </option>
              ))}
            </Select>
            <Input
              aria-label="Quantity"
              type="number"
              min={1}
              className="w-20"
              value={line.quantity}
              onChange={(event) => {
                updateLine(index, { quantity: event.target.value });
              }}
            />
            {lines.length > 1 && (
              <Button
                type="button"
                variant="secondary"
                aria-label="Remove item"
                onClick={() => {
                  setLines((current) => current.filter((_, at) => at !== index));
                }}
              >
                ×
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setLines((current) => [...current, { variantId: '', quantity: '1' }]);
          }}
        >
          Add item
        </Button>
      </div>
      <Field label="Discount (optional)">
        <Input
          inputMode="decimal"
          value={discount}
          onChange={(event) => {
            setDiscount(event.target.value);
          }}
        />
      </Field>
      <Field label="Note (optional)">
        <Input
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
          }}
        />
      </Field>
      <p className="text-right text-sm text-muted">
        Subtotal {formatMoney(subtotal, store.currency)}
      </p>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Button type="submit" busy={busy} className="w-full">
        Create order
      </Button>
    </form>
  );
};
