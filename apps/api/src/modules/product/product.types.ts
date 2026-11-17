// draft: being prepared; active: on sale; archived: off sale for good (orders still refer to it).
export const PRODUCT_STATUSES = ['draft', 'active', 'archived'] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export type ProductListFilters = {
  status?: ProductStatus | undefined;
  categoryId?: string | undefined;
  search?: string | undefined;
};
