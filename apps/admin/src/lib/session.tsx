'use client';

import { useRouter } from 'next/navigation';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { api, UNAUTHORIZED_EVENT } from './api';
import type { Envelope, MeDto, StoreSummary } from './types';
import { useResource } from './use-resource';

type SessionValue = {
  me: MeDto;
  store: StoreSummary | undefined;
  isOwner: boolean;
  selectStore: (storeId: string) => void;
  reload: () => void;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | undefined>(undefined);

const STORE_KEY = 'storekit_store';

const readStoredStore = () => {
  try {
    return localStorage.getItem(STORE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
};

// A store that cannot be remembered (private window, blocked storage) is simply chosen again.
const rememberStore = (id: string) => {
  try {
    localStorage.setItem(STORE_KEY, id);
    return true;
  } catch {
    return false;
  }
};

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const meResource = useResource<Envelope<MeDto>>('/auth/me');
  const [storeId, setStoreId] = useState<string | undefined>(readStoredStore);
  const me = meResource.data?.data;
  const signedOut = meResource.error !== undefined || (me && me.session.status !== 'active');
  const { reload: reloadMe } = meResource;

  useEffect(() => {
    if (signedOut) {
      router.replace('/login');
    }
  }, [signedOut, router]);

  useEffect(() => {
    const onUnauthorized = () => {
      router.replace('/login');
    };

    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);

    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    };
  }, [router]);

  const value = useMemo<SessionValue | undefined>(() => {
    if (!me || signedOut) {
      return undefined;
    }

    const store = me.stores.find(({ id }) => id === storeId) ?? me.stores[0];

    return {
      me,
      store,
      isOwner: store?.role === 'owner',
      selectStore: (id) => {
        setStoreId(id);
        rememberStore(id);
      },
      reload: reloadMe,
      logout: async () => {
        await api('/auth/logout', { method: 'POST' });
        router.replace('/login');
      },
    };
  }, [me, signedOut, storeId, reloadMe, router]);

  if (!value) {
    return <p className="p-8 text-muted">Loading…</p>;
  }

  return <SessionContext value={value}>{children}</SessionContext>;
};

export const useSession = () => {
  const value = useContext(SessionContext);

  if (!value) {
    throw new Error('useSession must be used inside SessionProvider');
  }

  return value;
};

// The store every page works in: pages under (app) render only once there is one.
export const useStore = () => {
  const { store, isOwner } = useSession();

  if (!store) {
    throw new Error('No store selected');
  }

  return { store, isOwner, base: `/stores/${store.id}` };
};
