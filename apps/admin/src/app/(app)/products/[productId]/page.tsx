'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { type SyntheticEvent, useState } from 'react';
import { AddVariantButton, VariantRow } from '@/components/variant-panel';
import { Button, Card, ErrorNote, Field, Input, Select, Textarea } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { PRODUCT_STATUS_LABELS } from '@/lib/labels';
import { useStore } from '@/lib/session';
import type { CategoryDto, Envelope, ProductDto, ProductStatus } from '@/lib/types';
import { useResource } from '@/lib/use-resource';

const ProductPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const router = useRouter();
  const { isOwner, base } = useStore();
  const product = useResource<Envelope<ProductDto>>(`${base}/products/${productId}`);
  const categories = useResource<Envelope<CategoryDto[]>>(`${base}/categories`);
  const data = product.data?.data;
  // Edits are kept apart from what was loaded: a field changes only once someone types in it.
  const [edits, setEdits] = useState<{
    title?: string;
    description?: string;
    categoryId?: string;
    status?: ProductStatus;
  }>({});
  const title = edits.title ?? data?.title ?? '';
  const description = edits.description ?? data?.description ?? '';
  const categoryId = edits.categoryId ?? data?.categoryId ?? '';
  const status = edits.status ?? data?.status ?? 'draft';
  const setTitle = (value: string) => {
    setEdits((current) => ({ ...current, title: value }));
  };
  const setDescription = (value: string) => {
    setEdits((current) => ({ ...current, description: value }));
  };
  const setCategoryId = (value: string) => {
    setEdits((current) => ({ ...current, categoryId: value }));
  };
  const setStatus = (value: ProductStatus) => {
    setEdits((current) => ({ ...current, status: value }));
  };
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async (event: SyntheticEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    setSaved(false);

    try {
      await api(`${base}/products/${productId}`, {
        method: 'PATCH',
        body: {
          title,
          description: description.trim() === '' ? null : description,
          categoryId: categoryId || null,
          status,
        },
      });
      setSaved(true);
      setEdits({});
      product.reload();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setError(undefined);

    try {
      await api(`${base}/products/${productId}`, { method: 'DELETE' });
      router.replace('/products');
    } catch (caught) {
      setError(errorText(caught));
    }
  };

  if (!data) {
    return product.error ? (
      <ErrorNote>{product.error.message}</ErrorNote>
    ) : (
      <p className="text-muted">Loading…</p>
    );
  }

  return (
    <>
      <Link href="/products" className="text-sm text-muted">
        ← Products
      </Link>
      <h1 className="mt-2 mb-5 text-2xl font-semibold tracking-tight">{data.title}</h1>
      <div className="grid gap-4 md:grid-cols-[20rem_1fr]">
        <Card className="p-4">
          <form className="space-y-4" onSubmit={(event) => void save(event)}>
            <Field label="Title">
              <Input
                value={title}
                disabled={!isOwner}
                onChange={(event) => {
                  setTitle(event.target.value);
                }}
                required
              />
            </Field>
            <Field label="Description">
              <Textarea
                rows={4}
                value={description}
                disabled={!isOwner}
                onChange={(event) => {
                  setDescription(event.target.value);
                }}
              />
            </Field>
            <Field label="Category">
              <Select
                value={categoryId}
                disabled={!isOwner}
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
            <Field label="Status">
              <Select
                value={status}
                disabled={!isOwner}
                onChange={(event) => {
                  setStatus(event.target.value as ProductStatus);
                }}
              >
                {Object.entries(PRODUCT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            {error && <ErrorNote>{error}</ErrorNote>}
            {saved && <p className="text-sm text-status-completed">Saved</p>}
            {isOwner && (
              <div className="flex gap-2">
                <Button type="submit" busy={busy} className="flex-1">
                  Save
                </Button>
                {data.status === 'draft' && (
                  <Button type="button" variant="danger" onClick={() => void remove()}>
                    Delete
                  </Button>
                )}
              </div>
            )}
          </form>
        </Card>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-semibold">Variants</h2>
            {isOwner && <AddVariantButton productId={productId} onChanged={product.reload} />}
          </div>
          <ul className="divide-y divide-border">
            {data.variants.map((variant) => (
              <VariantRow
                key={variant.id}
                productId={productId}
                variant={variant}
                onChanged={product.reload}
              />
            ))}
            {data.variants.length === 0 && (
              <li className="px-4 py-8 text-center text-muted">
                No variants yet. Add one to put this product on sale.
              </li>
            )}
          </ul>
        </Card>
      </div>
    </>
  );
};

export default ProductPage;
