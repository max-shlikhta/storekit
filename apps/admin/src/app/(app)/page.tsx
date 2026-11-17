'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CreateStoreForm } from '@/components/create-store-form';
import { useSession } from '@/lib/session';

const HomePage = () => {
  const router = useRouter();
  const { store } = useSession();

  useEffect(() => {
    if (store) {
      router.replace('/orders');
    }
  }, [store, router]);

  return store ? <p className="text-muted">Loading…</p> : <CreateStoreForm />;
};

export default HomePage;
