'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type SyntheticEvent, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorNote,
  Field,
  Input,
  PageHeader,
  Select,
  Sheet,
} from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { PRODUCT_STATUS_LABELS } from '@/lib/labels';
import { useStore } from '@/lib/session';
import type { CategoryDto, Envelope, ListEnvelope, ProductDto, ProductStatus } from '@/lib/types';
import { useResource } from '@/lib/use-resource';

const STATUS_COLORS: Record<ProductStatus, string> = {
  draft: 'var(--status-new)',
  active: 'var(--status-completed)',
  archived: 'var(--status-cancelled)',
};

const ProductsPage = () => {
  const router = useRouter();
  const { store, isOwner, base } = useStore();
  const [status, setStatus] = useState<ProductStatus | ''>('');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const query = new URLSearchParams({ limit: '100' });

  if (status) {
    query.set('status', status);
  }

  if (search.trim()) {
    query.set('search', search.trim());
  }

  const products = useResource<ListEnvelope<ProductDto>>(`${base}/products?${query.toString()}`);
  const categories = useResource<Envelope<CategoryDto[]>>(`${base}/categories`);

  const create = async (event: SyntheticEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);

    try {
      const { data } = await api<Envelope<ProductDto>>(`${base}/products`, {
        method: 'POST',
        body: { title, ...(categoryId && { categoryId }) },
      });

      router.push(`/products/${data.id}`);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Products">
        {isOwner && (
          <Button
            onClick={() => {
              setCreating(true);
            }}
          >
            New product
          </Button>
        )}
      </PageHeader>
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_12rem]">
        <Input
          type="search"
          placeholder="Search by title"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />
        <Select
          aria-label="Status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as ProductStatus | '');
          }}
        >
          <option value="">All statuses</option>
          {Object.entries(PRODUCT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      {products.error && <ErrorNote>{products.error.message}</ErrorNote>}
      <Card className="divide-y divide-border overflow-hidden">
        {products.data?.data.map((product) => {
          const prices = product.variants.map(({ priceMinor }) => priceMinor);
          const stock = product.variants.reduce((sum, { stockOnHand }) => sum + stockOnHand, 0);

          return (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-bg"
            >
              <span className="min-w-36 flex-1 truncate font-medium">{product.title}</span>
              <Badge color={STATUS_COLORS[product.status]}>
                {PRODUCT_STATUS_LABELS[product.status]}
              </Badge>
              <span className="w-28 text-right">
                {prices.length > 0
                  ? Math.min(...prices) === Math.max(...prices)
                    ? formatMoney(Math.min(...prices), store.currency)
                    : `from ${formatMoney(Math.min(...prices), store.currency)}`
                  : '—'}
              </span>
              <span className="w-24 text-right text-sm text-muted">{stock} in stock</span>
            </Link>
          );
        })}
        {products.data?.data.length === 0 && <Empty>No products found.</Empty>}
        {!products.data && !products.error && <Empty>Loading…</Empty>}
      </Card>
      {creating && (
        <Sheet
          title="New product"
          onClose={() => {
            setCreating(false);
          }}
        >
          <form className="space-y-4" onSubmit={(event) => void create(event)}>
            <Field label="Title">
              <Input
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                }}
                required
                autoFocus
              />
            </Field>
            <Field label="Category">
              <Select
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(event.target.value);
                }}
              >
                <option value="">No category</option>
                {categories.data?.data.map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </Select>
            </Field>
            {error && <ErrorNote>{error}</ErrorNote>}
            <Button type="submit" busy={busy} className="w-full">
              Create draft
            </Button>
          </form>
        </Sheet>
      )}
    </>
  );
};

export default ProductsPage;
