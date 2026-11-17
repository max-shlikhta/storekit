// What the API returns. Kept next to nothing else, so the shapes can be compared with the API's
// DTO mappers at a glance.
export type Envelope<T> = { data: T };

export type ListEnvelope<T> = { data: T[]; meta: { total: number; limit: number; offset: number } };

export type SessionStatus = 'active' | 'two_factor_pending' | 'two_factor_setup_required';

export type StoreRole = 'owner' | 'staff';

export type StoreSummary = {
  id: string;
  slug: string;
  name: string;
  currency: string;
  role: StoreRole;
};

export type UserDto = {
  id: string;
  email: string;
  name: string | null;
  twoFactorEnabled: boolean;
};

export type MeDto = {
  user: UserDto;
  session: { status: SessionStatus };
  stores: StoreSummary[];
};

export type OrderStatus = 'new' | 'confirmed' | 'shipped' | 'completed' | 'cancelled';

export type OrderLineDto = {
  id: string;
  variantId: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  unitPriceMinor: number;
  // Present for owners only.
  unitCostMinor?: number | null;
  quantity: number;
  lineTotalMinor: number;
};

export type OrderEventDto = {
  id: string;
  type: 'created' | 'status_changed';
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus | null;
  data: { reason?: string | null };
  createdAt: string;
};

export type OrderDto = {
  id: string;
  number: number;
  status: OrderStatus;
  customerName: string;
  customerPhone: string | null;
  currency: string;
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  note: string | null;
  cancelReason: string | null;
  lines: OrderLineDto[];
  events?: OrderEventDto[];
  createdAt: string;
};

export type ProductStatus = 'draft' | 'active' | 'archived';

export type VariantDto = {
  id: string;
  productId: string;
  sku: string;
  title: string;
  priceMinor: number;
  // Present for owners only.
  costPriceMinor?: number | null;
  stockOnHand: number;
  allowBackorder: boolean;
  isActive: boolean;
};

export type ProductDto = {
  id: string;
  categoryId: string | null;
  title: string;
  description: string | null;
  status: ProductStatus;
  variants: VariantDto[];
  createdAt: string;
};

export type CategoryDto = { id: string; name: string; position: number };

export type MemberDto = {
  role: StoreRole;
  addedAt: string;
  user: UserDto;
};

export type StockMovementDto = {
  id: string;
  reason: string;
  delta: number;
  quantityAfter: number;
  note: string | null;
  createdAt: string;
};

export type StockMode = 'delta' | 'set';
