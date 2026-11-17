'use client';

import { type SyntheticEvent, useState } from 'react';
import { api, errorText } from '@/lib/api';
import { formatDateTime, formatMoney, parseMoney, toMajor } from '@/lib/format';
import { STOCK_REASON_LABELS } from '@/lib/labels';
import { useStore } from '@/lib/session';
import type { Envelope, ListEnvelope, StockMovementDto, StockMode, VariantDto } from '@/lib/types';
import { useResource } from '@/lib/use-resource';
import { Badge, Button, ErrorNote, Field, Input, Select, Sheet } from './ui';

const StockMovements = ({ productId, variantId }: { productId: string; variantId: string }) => {
  const { base } = useStore();
  const movements = useResource<ListEnvelope<StockMovementDto>>(
    `${base}/products/${productId}/variants/${variantId}/stock-movements?limit=20`,
  );

  return (
    <ul className="mt-3 divide-y divide-border text-sm">
      {movements.data?.data.map((movement) => (
        <li key={movement.id} className="flex justify-between gap-3 py-2">
          <span>
            {STOCK_REASON_LABELS[movement.reason] ?? movement.reason}
            {movement.note && <span className="text-muted"> · {movement.note}</span>}
            <span className="block text-muted">{formatDateTime(movement.createdAt)}</span>
          </span>
          <span className="text-right">
            <span className={movement.delta > 0 ? 'text-status-completed' : 'text-danger'}>
              {movement.delta > 0 ? '+' : ''}
              {movement.delta}
            </span>
            <span className="block text-muted">→ {movement.quantityAfter}</span>
          </span>
        </li>
      ))}
    </ul>
  );
};

const StockForm = ({
  productId,
  variant,
  onDone,
}: {
  productId: string;
  variant: VariantDto;
  onDone: () => void;
}) => {
  const { base } = useStore();
  const [mode, setMode] = useState<StockMode>('delta');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState<'restock' | 'write_off' | 'correction'>('restock');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);

    try {
      const value = Number(amount);
      // A write-off is typed as a positive number of units and sent as a negative delta.
      const delta = reason === 'write_off' ? -Math.abs(value) : value;

      await api(`${base}/products/${productId}/variants/${variant.id}/stock-adjustments`, {
        method: 'POST',
        body:
          mode === 'set'
            ? { mode, quantity: value, ...(note && { note }) }
            : { mode, delta, reason, ...(note && { note }) },
      });
      onDone();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={(event) => void submit(event)}>
      <p className="text-sm text-muted">On hand now: {variant.stockOnHand}</p>
      <Field label="Change">
        <Select
          value={mode}
          onChange={(event) => {
            setMode(event.target.value as StockMode);
          }}
        >
          <option value="delta">Add or remove units</option>
          <option value="set">Set the counted quantity (stocktake)</option>
        </Select>
      </Field>
      {mode === 'delta' && (
        <Field label="Reason">
          <Select
            value={reason}
            onChange={(event) => {
              setReason(event.target.value as typeof reason);
            }}
          >
            <option value="restock">Restock (adds)</option>
            <option value="write_off">Write-off (removes)</option>
            <option value="correction">Correction (+ or −)</option>
          </Select>
        </Field>
      )}
      <Field label={mode === 'set' ? 'Counted quantity' : 'Units'}>
        <Input
          type="number"
          step={1}
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
          }}
          required
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
      {error && <ErrorNote>{error}</ErrorNote>}
      <Button type="submit" busy={busy} className="w-full">
        Save
      </Button>
    </form>
  );
};

const VariantForm = ({
  productId,
  variant,
  onDone,
}: {
  productId: string;
  variant?: VariantDto;
  onDone: () => void;
}) => {
  const { base } = useStore();
  const [sku, setSku] = useState(variant?.sku ?? '');
  const [title, setTitle] = useState(variant?.title ?? '');
  const [price, setPrice] = useState(variant ? toMajor(variant.priceMinor) : '');
  const [cost, setCost] = useState(
    variant?.costPriceMinor == null ? '' : toMajor(variant.costPriceMinor),
  );
  const [stock, setStock] = useState('');
  const [backorder, setBackorder] = useState(variant?.allowBackorder ?? false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const ownerSeesCosts = variant === undefined || variant.costPriceMinor !== undefined;

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);

    try {
      const priceMinor = parseMoney(price);
      const costMinor = cost === '' ? null : parseMoney(cost);

      if (priceMinor === null || (cost !== '' && costMinor === null)) {
        throw new Error('A price is not a valid amount');
      }

      const body = {
        sku,
        title,
        priceMinor,
        ...(ownerSeesCosts && { costPriceMinor: costMinor }),
        allowBackorder: backorder,
      };

      if (variant) {
        await api(`${base}/products/${productId}/variants/${variant.id}`, {
          method: 'PATCH',
          body,
        });
      } else {
        await api(`${base}/products/${productId}/variants`, {
          method: 'POST',
          body: { ...body, ...(stock && { initialStock: Number(stock) }) },
        });
      }

      onDone();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={(event) => void submit(event)}>
      <Field label="SKU">
        <Input
          value={sku}
          onChange={(event) => {
            setSku(event.target.value);
          }}
          required
        />
      </Field>
      <Field label="Variant (size, colour…)">
        <Input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
          }}
          required
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price">
          <Input
            inputMode="decimal"
            value={price}
            onChange={(event) => {
              setPrice(event.target.value);
            }}
            required
          />
        </Field>
        <Field label="Purchase price">
          <Input
            inputMode="decimal"
            value={cost}
            onChange={(event) => {
              setCost(event.target.value);
            }}
          />
        </Field>
      </div>
      {!variant && (
        <Field label="Initial stock">
          <Input
            type="number"
            min={0}
            value={stock}
            onChange={(event) => {
              setStock(event.target.value);
            }}
          />
        </Field>
      )}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={backorder}
          onChange={(event) => {
            setBackorder(event.target.checked);
          }}
        />
        Allow selling below zero (backorder)
      </label>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Button type="submit" busy={busy} className="w-full">
        Save variant
      </Button>
    </form>
  );
};

export const VariantRow = ({
  productId,
  variant,
  onChanged,
}: {
  productId: string;
  variant: VariantDto;
  onChanged: () => void;
}) => {
  const { store, isOwner } = useStore();
  const [panel, setPanel] = useState<'stock' | 'edit' | null>(null);
  const [history, setHistory] = useState(false);
  const { base } = useStore();
  const [error, setError] = useState<string>();

  const toggleActive = async () => {
    setError(undefined);

    try {
      await api<Envelope<VariantDto>>(`${base}/products/${productId}/variants/${variant.id}`, {
        method: 'PATCH',
        body: { isActive: !variant.isActive },
      });
      onChanged();
    } catch (caught) {
      setError(errorText(caught));
    }
  };

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium">
            {variant.title}{' '}
            {!variant.isActive && <Badge color="var(--status-cancelled)">Off</Badge>}
          </div>
          <div className="text-sm text-muted">
            {variant.sku} · {formatMoney(variant.priceMinor, store.currency)}
            {variant.costPriceMinor != null && (
              <> · cost {formatMoney(variant.costPriceMinor, store.currency)}</>
            )}
          </div>
        </div>
        <button
          className="text-right"
          onClick={() => {
            setHistory(!history);
          }}
        >
          <span
            className={variant.stockOnHand <= 0 ? 'font-semibold text-danger' : 'font-semibold'}
          >
            {variant.stockOnHand}
          </span>
          <span className="block text-sm text-muted">in stock</span>
        </button>
        {isOwner && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setPanel('stock');
              }}
            >
              Stock
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setPanel('edit');
              }}
            >
              Edit
            </Button>
            <Button variant="secondary" onClick={() => void toggleActive()}>
              {variant.isActive ? 'Turn off' : 'Turn on'}
            </Button>
          </div>
        )}
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      {history && <StockMovements productId={productId} variantId={variant.id} />}
      {panel && (
        <Sheet
          title={panel === 'stock' ? `Stock · ${variant.title}` : `Edit · ${variant.title}`}
          onClose={() => {
            setPanel(null);
          }}
        >
          {panel === 'stock' ? (
            <StockForm
              productId={productId}
              variant={variant}
              onDone={() => {
                setPanel(null);
                onChanged();
              }}
            />
          ) : (
            <VariantForm
              productId={productId}
              variant={variant}
              onDone={() => {
                setPanel(null);
                onChanged();
              }}
            />
          )}
        </Sheet>
      )}
    </li>
  );
};

export const AddVariantButton = ({
  productId,
  onChanged,
}: {
  productId: string;
  onChanged: () => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setOpen(true);
        }}
      >
        Add variant
      </Button>
      {open && (
        <Sheet
          title="New variant"
          onClose={() => {
            setOpen(false);
          }}
        >
          <VariantForm
            productId={productId}
            onDone={() => {
              setOpen(false);
              onChanged();
            }}
          />
        </Sheet>
      )}
    </>
  );
};
