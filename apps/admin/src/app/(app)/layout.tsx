import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { SessionProvider } from '@/lib/session';

const AppLayout = ({ children }: { children: ReactNode }) => (
  <SessionProvider>
    <AppShell>{children}</AppShell>
  </SessionProvider>
);

export default AppLayout;
