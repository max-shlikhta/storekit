'use client';

import { type SyntheticEvent, useState } from 'react';
import { Button, Card, Empty, ErrorNote, Input, PageHeader } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { useStore } from '@/lib/session';
import type { CategoryDto, Envelope } from '@/lib/types';
import { useResource } from '@/lib/use-resource';

const CategoriesPage = () => {
  const { isOwner, base } = useStore();
  const categories = useResource<Envelope<CategoryDto[]>>(`${base}/categories`);
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();

  const add = async (event: SyntheticEvent) => {
    event.preventDefault();
    setError(undefined);

    try {
      await api(`${base}/categories`, { method: 'POST', body: { name } });
      setName('');
      categories.reload();
    } catch (caught) {
      setError(errorText(caught));
    }
  };

  const remove = async (id: string) => {
    setError(undefined);

    try {
      await api(`${base}/categories/${id}`, { method: 'DELETE' });
      categories.reload();
    } catch (caught) {
      setError(errorText(caught));
    }
  };

  return (
    <>
      <PageHeader title="Categories" />
      {isOwner && (
        <form className="mb-4 flex gap-2" onSubmit={(event) => void add(event)}>
          <Input
            placeholder="New category"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            required
          />
          <Button type="submit">Add</Button>
        </form>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
      <Card className="divide-y divide-border overflow-hidden">
        {categories.data?.data.map((category) => (
          <div key={category.id} className="flex items-center justify-between px-4 py-3">
            <span>{category.name}</span>
            {isOwner && (
              <Button variant="secondary" onClick={() => void remove(category.id)}>
                Delete
              </Button>
            )}
          </div>
        ))}
        {categories.data?.data.length === 0 && <Empty>No categories yet.</Empty>}
      </Card>
    </>
  );
};

export default CategoriesPage;
