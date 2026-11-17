'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { NewOrderForm } from '@/components/new-order-form';
import { OrderStatusBadge } from '@/components/order-status-badge';
import { Button, Card, Empty, ErrorNote, Input, PageHeader, Select, Sheet } from '@/components/ui';
import { formatDateTime, formatMoney } from '@/lib/format';
import { ORDER_STATUS_LABELS } from '@/lib/labels';
import { useStore } from '@/lib/session';
import type { ListEnvelope, OrderDto, OrderStatus } from '@/lib/types';
import { useResource } from '@/lib/use-resource';

const PAGE_SIZE = 20;

const OrdersPage = () => {
  const router = useRouter();
  const { store, base } = useStore();
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [creating, setCreating] = useState(false);

  const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });

  if (status) {
    query.set('status', status);
  }

  if (search.trim()) {
    query.set('search', search.trim());
  }

  const orders = useResource<ListEnvelope<OrderDto>>(`${base}/orders?${query.toString()}`);
  const total = orders.data?.meta.total ?? 0;

  return (
    <>
      <PageHeader title="Orders">
        <Button
          onClick={() => {
            setCreating(true);
          }}
        >
          New order
        </Button>
      </PageHeader>
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_12rem]">
        <Input
          type="search"
          placeholder="Search by number or customer"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setOffset(0);
          }}
        />
        <Select
          aria-label="Status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as OrderStatus | '');
            setOffset(0);
          }}
        >
          <option value="">All statuses</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>
      {orders.error && <ErrorNote>{orders.error.message}</ErrorNote>}
      <Card className="divide-y divide-border overflow-hidden">
        {orders.data?.data.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-bg"
          >
            <span className="w-14 font-semibold">#{order.number}</span>
            <span className="min-w-36 flex-1 truncate">{order.customerName}</span>
            <OrderStatusBadge status={order.status} />
            <span className="ml-auto w-24 text-right font-medium">
              {formatMoney(order.totalMinor, store.currency)}
            </span>
            <span className="hidden w-44 text-right text-sm whitespace-nowrap text-muted sm:block">
              {formatDateTime(order.createdAt)}
            </span>
          </Link>
        ))}
        {orders.data?.data.length === 0 && <Empty>No orders yet.</Empty>}
        {!orders.data && !orders.error && <Empty>Loading…</Empty>}
      </Card>
      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <Button
            variant="secondary"
            disabled={offset === 0}
            onClick={() => {
              setOffset(Math.max(0, offset - PAGE_SIZE));
            }}
          >
            Previous
          </Button>
          <span>
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
          </span>
          <Button
            variant="secondary"
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => {
              setOffset(offset + PAGE_SIZE);
            }}
          >
            Next
          </Button>
        </div>
      )}
      {creating && (
        <Sheet
          title="New order"
          onClose={() => {
            setCreating(false);
          }}
        >
          <NewOrderForm
            onCreated={(orderId) => {
              router.push(`/orders/${orderId}`);
            }}
          />
        </Sheet>
      )}
    </>
  );
};

export default OrdersPage;
