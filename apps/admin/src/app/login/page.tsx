'use client';

import { useRouter } from 'next/navigation';
import { type SyntheticEvent, useState } from 'react';
import { Button, Card, ErrorNote, Field, Input } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import type { Envelope, SessionStatus } from '@/lib/types';

type SessionReply = Envelope<{ session: { status: SessionStatus } }>;

const LoginPage = () => {
  const router = useRouter();
  const [step, setStep] = useState<'password' | 'code'>('password');
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const submit = async (event: SyntheticEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(undefined);

    try {
      const reply =
        step === 'password'
          ? await api<SessionReply>('/auth/login', { method: 'POST', body: { email, password } })
          : await api<SessionReply>('/auth/two-factor/verify', { method: 'POST', body: { code } });

      if (reply.data.session.status === 'two_factor_pending') {
        setStep('code');
        return;
      }

      router.replace('/');
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-sm items-center px-4">
      <Card className="w-full space-y-5 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Storekit</h1>
          <p className="text-muted">
            {step === 'password' ? 'Sign in to your back office' : 'Enter your authentication code'}
          </p>
        </div>
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          {step === 'password' ? (
            <>
              <Field label="Email">
                <Input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                  }}
                  required
                />
              </Field>
              <Field label="Password">
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                  }}
                  required
                />
              </Field>
            </>
          ) : (
            <Field label="Code from your authenticator app, or a recovery code">
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                }}
                required
                autoFocus
              />
            </Field>
          )}
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button type="submit" busy={busy} className="w-full">
            {step === 'password' ? 'Sign in' : 'Verify'}
          </Button>
        </form>
      </Card>
    </main>
  );
};

export default LoginPage;
