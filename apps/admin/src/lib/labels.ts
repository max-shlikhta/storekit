import type { OrderStatus, ProductStatus } from './types';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'New',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: 'Draft',
  active: 'On sale',
  archived: 'Archived',
};

// The next step of an order's life, the same flow as the API's ALLOWED_TRANSITIONS.
export const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
  new: 'confirmed',
  confirmed: 'shipped',
  shipped: 'completed',
  completed: null,
  cancelled: null,
};

export const CAN_CANCEL: Record<OrderStatus, boolean> = {
  new: true,
  confirmed: true,
  shipped: false,
  completed: false,
  cancelled: false,
};

export const STOCK_REASON_LABELS: Record<string, string> = {
  initial: 'Initial stock',
  restock: 'Restock',
  stocktake: 'Stocktake',
  correction: 'Correction',
  write_off: 'Write-off',
  order: 'Order',
  order_cancel: 'Order cancelled',
};
