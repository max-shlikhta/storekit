'use client';

import { type SyntheticEvent, useState } from 'react';
import { Badge, Button, Card, ErrorNote, Input, PageHeader } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { useSession, useStore } from '@/lib/session';
import type { Envelope, MemberDto } from '@/lib/types';
import { useResource } from '@/lib/use-resource';

const TeamPage = () => {
  const { me } = useSession();
  const { isOwner, base } = useStore();
  const members = useResource<Envelope<MemberDto[]>>(isOwner ? `${base}/members` : null);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();

  const add = async (event: SyntheticEvent) => {
    event.preventDefault();
    setError(undefined);

    try {
      await api(`${base}/members`, { method: 'POST', body: { email } });
      setEmail('');
      members.reload();
    } catch (caught) {
      setError(errorText(caught));
    }
  };

  const remove = async (userId: string) => {
    setError(undefined);

    try {
      await api(`${base}/members/${userId}`, { method: 'DELETE' });
      members.reload();
    } catch (caught) {
      setError(errorText(caught));
    }
  };

  if (!isOwner) {
    return <ErrorNote>Only the owner can manage the team.</ErrorNote>;
  }

  return (
    <>
      <PageHeader title="Team" />
      <form className="mb-4 flex gap-2" onSubmit={(event) => void add(event)}>
        <Input
          type="email"
          placeholder="Email of an existing account"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
          required
        />
        <Button type="submit">Add as staff</Button>
      </form>
      {error && <ErrorNote>{error}</ErrorNote>}
      <Card className="divide-y divide-border overflow-hidden">
        {members.data?.data.map((member) => (
          <div key={member.user.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{member.user.name ?? member.user.email}</div>
              <div className="truncate text-sm text-muted">{member.user.email}</div>
            </div>
            <Badge color={member.role === 'owner' ? 'var(--accent)' : 'var(--muted)'}>
              {member.role}
            </Badge>
            {member.role === 'staff' && member.user.id !== me.user.id && (
              <Button variant="secondary" onClick={() => void remove(member.user.id)}>
                Remove
              </Button>
            )}
          </div>
        ))}
      </Card>
    </>
  );
};

export default TeamPage;
