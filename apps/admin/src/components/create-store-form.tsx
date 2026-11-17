'use client';

import { type SyntheticEvent, useState } from 'react';
import { api, errorText } from '@/lib/api';
import { useSession } from '@/lib/session';
import { Button, Card, ErrorNote, Field, Input } from './ui';

const slugOf = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const CreateStoreForm = () => {
  const { reload, selectStore } = useSession();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);

    try {
      const { data } = await api<{ data: { id: string } }>('/stores', {
        method: 'POST',
        body: { name, slug: slug || slugOf(name) },
      });

      selectStore(data.id);
      reload();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-xl font-semibold">Create your first store</h1>
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <Field label="Store name">
          <Input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
            }}
            required
          />
        </Field>
        <Field label="Address">
          <Input
            value={slug}
            placeholder={slugOf(name)}
            onChange={(event) => {
              setSlug(event.target.value);
            }}
          />
        </Field>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button type="submit" busy={busy}>
          Create store
        </Button>
      </form>
    </Card>
  );
};
