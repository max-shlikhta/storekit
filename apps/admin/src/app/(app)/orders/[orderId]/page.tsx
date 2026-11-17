'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { OrderStatusBadge } from '@/components/order-status-badge';
import { Button, Card, ErrorNote, Field, Input, Sheet } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { formatDateTime, formatMoney } from '@/lib/format';
import { CAN_CANCEL, NEXT_STATUS, ORDER_STATUS_LABELS } from '@/lib/labels';
import { useStore } from '@/lib/session';
import type { Envelope, OrderDto, OrderStatus } from '@/lib/types';
import { useResource } from '@/lib/use-resource';

const OrderPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { base } = useStore();
  const order = useResource<Envelope<OrderDto>>(`${base}/orders/${orderId}`);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');

  const data = order.data?.data;

  const move = async (status: OrderStatus, cancelReason?: string) => {
    setBusy(true);
    setError(undefined);

    try {
      await api(`${base}/orders/${orderId}/status`, {
        method: 'POST',
        body: { status, ...(cancelReason && { reason: cancelReason }) },
      });
      setCancelling(false);
      order.reload();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return order.error ? (
      <ErrorNote>{order.error.message}</ErrorNote>
    ) : (
      <p className="text-muted">Loading…</p>
    );
  }

  const next = NEXT_STATUS[data.status];
  const showCosts = data.lines.some((line) => line.unitCostMinor !== undefined);

  return (
    <>
      <Link href="/orders" className="text-sm text-muted">
        ← Orders
      </Link>
      <div className="mt-2 mb-5 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Order #{data.number}</h1>
        <OrderStatusBadge status={data.status} />
        <div className="ml-auto flex gap-2">
          {CAN_CANCEL[data.status] && (
            <Button
              variant="danger"
              onClick={() => {
                setCancelling(true);
              }}
            >
              Cancel order
            </Button>
          )}
          {next && (
            <Button
              busy={busy}
              onClick={() => {
                void move(next);
              }}
            >
              Mark as {ORDER_STATUS_LABELS[next].toLowerCase()}
            </Button>
          )}
        </div>
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_18rem]">
        <Card className="overflow-hidden">
          <table className="w-full text-left">
            <thead className="border-b border-border text-sm text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Item</th>
                <th className="px-2 py-2 text-right font-medium">Qty</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-3">
                    <div>{line.productTitle}</div>
                    <div className="text-sm text-muted">
                      {line.variantTitle} · {line.sku} ·{' '}
                      {formatMoney(line.unitPriceMinor, data.currency)}
                      {showCosts && line.unitCostMinor != null && (
                        <> · cost {formatMoney(line.unitCostMinor, data.currency)}</>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-right">{line.quantity}</td>
                  <td className="px-4 py-3 text-right">
                    {formatMoney(line.lineTotalMinor, data.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="space-y-1 border-t border-border px-4 py-3 text-right">
            <div className="flex justify-between text-muted">
              <dt>Subtotal</dt>
              <dd>{formatMoney(data.subtotalMinor, data.currency)}</dd>
            </div>
            {data.discountMinor > 0 && (
              <div className="flex justify-between text-muted">
                <dt>Discount</dt>
                <dd>−{formatMoney(data.discountMinor, data.currency)}</dd>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold">
              <dt>Total</dt>
              <dd>{formatMoney(data.totalMinor, data.currency)}</dd>
            </div>
          </dl>
        </Card>
        <div className="space-y-4">
          <Card className="space-y-1 p-4">
            <h2 className="font-semibold">Customer</h2>
            <p>{data.customerName}</p>
            {data.customerPhone && <p className="text-muted">{data.customerPhone}</p>}
            {data.note && <p className="pt-2 text-sm text-muted">Note: {data.note}</p>}
            {data.cancelReason && (
              <p className="pt-2 text-sm text-danger">Cancelled: {data.cancelReason}</p>
            )}
          </Card>
          <Card className="p-4">
            <h2 className="mb-3 font-semibold">History</h2>
            <ol className="space-y-3">
              {data.events?.map((event) => (
                <li key={event.id} className="text-sm">
                  <div>
                    {event.type === 'created'
                      ? 'Order created'
                      : `${event.fromStatus ? ORDER_STATUS_LABELS[event.fromStatus] : ''} → ${event.toStatus ? ORDER_STATUS_LABELS[event.toStatus] : ''}`}
                  </div>
                  <div className="text-muted">{formatDateTime(event.createdAt)}</div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
      {cancelling && (
        <Sheet
          title="Cancel order"
          onClose={() => {
            setCancelling(false);
          }}
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void move('cancelled', reason);
            }}
          >
            <p className="text-sm text-muted">The items go back to the shelf.</p>
            <Field label="Reason">
              <Input
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                }}
                required
                autoFocus
              />
            </Field>
            <Button type="submit" variant="danger" busy={busy} className="w-full">
              Cancel order
            </Button>
          </form>
        </Sheet>
      )}
    </>
  );
};

export default OrderPage;
