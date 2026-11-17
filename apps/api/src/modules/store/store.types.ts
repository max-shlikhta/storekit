export const STORE_ROLES = ['owner', 'staff'] as const;

export type StoreRole = (typeof STORE_ROLES)[number];
