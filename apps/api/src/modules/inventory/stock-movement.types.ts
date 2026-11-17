export const STOCK_MOVEMENT_REASONS = [
  'initial',
  'restock',
  'stocktake',
  'correction',
  'write_off',
  'order',
  'order_cancel',
] as const;

export type StockMovementReason = (typeof STOCK_MOVEMENT_REASONS)[number];

export type StockAdjustment = {
  storeId: string;
  variantId: string;
  delta: number;
  reason: StockMovementReason;
  note?: string | null | undefined;
  orderId?: string | undefined;
  errorPath?: string | undefined;
};

export type StockChange = {
  storeId: string;
  variantId: string;
  delta: number;
  allowBackorder: boolean;
  maxQuantity: number;
};
