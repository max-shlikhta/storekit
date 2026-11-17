'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useSession } from '@/lib/session';
import { cx } from './ui';

const SECTIONS = [
  { href: '/orders', label: 'Orders', ownerOnly: false },
  { href: '/products', label: 'Products', ownerOnly: false },
  { href: '/categories', label: 'Categories', ownerOnly: false },
  { href: '/team', label: 'Team', ownerOnly: true },
];

export const AppShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const { me, store, isOwner, selectStore, logout } = useSession();
  const sections = SECTIONS.filter(({ ownerOnly }) => isOwner || !ownerOnly);

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 pb-24 sm:pb-10">
      <header className="flex flex-wrap items-center gap-3 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Storekit
        </Link>
        {store && me.stores.length > 1 && (
          <select
            aria-label="Store"
            value={store.id}
            onChange={(event) => {
              selectStore(event.target.value);
            }}
            className="min-h-11 rounded-lg border border-border bg-surface px-2"
          >
            {me.stores.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        )}
        {store && me.stores.length === 1 && <span className="text-muted">{store.name}</span>}
        <nav className="order-last hidden w-full gap-1 sm:order-none sm:ml-4 sm:flex sm:w-auto">
          {store &&
            sections.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cx(
                  'rounded-lg px-3 py-2 text-sm font-medium',
                  pathname.startsWith(href) ? 'bg-surface text-text' : 'text-muted',
                )}
              >
                {label}
              </Link>
            ))}
        </nav>
        <button className="ml-auto text-sm text-muted" onClick={() => void logout()}>
          Sign out ({me.user.email})
        </button>
      </header>
      {children}
      {store && (
        <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface sm:hidden">
          {sections.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cx(
                'flex min-h-14 flex-1 items-center justify-center text-sm font-medium',
                pathname.startsWith(href) ? 'text-accent' : 'text-muted',
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
};
