import { ORDER_STATUS_LABELS } from '@/lib/labels';
import type { OrderStatus } from '@/lib/types';
import { Badge } from './ui';

export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => (
  <Badge color={`var(--status-${status})`}>{ORDER_STATUS_LABELS[status]}</Badge>
);
