// new → confirmed → shipped → completed; new or confirmed can be cancelled.
export const ORDER_STATUSES = ['new', 'confirmed', 'shipped', 'completed', 'cancelled'] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  new: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['completed'],
  completed: [],
  cancelled: [],
};

// Lines and totals can be corrected only while the order is still with the store.
export const MAX_ORDER_TOTAL_MINOR = 2_000_000_000;

export const ORDER_EVENT_TYPES = ['created', 'status_changed'] as const;

export type OrderEventType = (typeof ORDER_EVENT_TYPES)[number];

export type OrderLineDraft = {
  variantId: string;
  quantity: number;
  index: number;
};

export type OrderListFilters = {
  status?: OrderStatus | undefined;
  search?: string | undefined;
};
