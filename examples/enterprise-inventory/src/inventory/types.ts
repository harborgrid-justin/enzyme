/**
 * Domain types for the enterprise inventory example.
 */

export type ItemCategory =
  | 'electronics'
  | 'hardware'
  | 'consumables'
  | 'apparel'
  | 'industrial';

export type StockStatus =
  | 'in-stock'
  | 'low-stock'
  | 'on-order'
  | 'out-of-stock'
  | 'discontinued';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: ItemCategory;
  status: StockStatus;
  /** Active warehouse this item lives in. */
  warehouse: string;
  /** Aisle / bin coordinates within the warehouse. */
  location: string;
  supplierId: string;
  supplierName: string;
  owner: string;
  quantity: number;
  reorderLevel: number;
  unitCost: number;
  retailPrice: number;
  /** ISO timestamp. */
  updatedAt: string;
  /** ISO timestamp of the last received restock. */
  lastRestockedAt: string;
  /** ISO timestamp; only set when status === 'on-order'. */
  expectedRestockAt?: string;
  tags: string[];
}

export interface UpdateStatusBody {
  status: StockStatus;
  expectedRestockAt?: string;
}

export interface UpdateStockBody {
  /** Signed quantity delta — negative for a pick / shrinkage, positive for receive. */
  delta: number;
  /** Free-form reason logged into the audit feed. */
  reason: string;
}

export interface UpdateDetailsBody {
  description: string;
  reorderLevel: number;
}

/** Per-inventory permission strings — used both by demo users and by client-side gating. */
export const INVENTORY_PERMISSIONS = {
  READ: 'inventory:read',
  ADJUST_STOCK: 'inventory:adjust',
  CREATE: 'inventory:create',
  UPDATE: 'inventory:update',
  ORDER: 'inventory:order',
  DISCONTINUE: 'inventory:discontinue',
  MANAGE_SETTINGS: 'settings:manage',
} as const;

export type InventoryPermission =
  (typeof INVENTORY_PERMISSIONS)[keyof typeof INVENTORY_PERMISSIONS];

/** Compute the appropriate stock status from a quantity + reorder threshold. */
export function deriveStockStatus(
  quantity: number,
  reorderLevel: number,
  current: StockStatus
): StockStatus {
  if (current === 'discontinued') return 'discontinued';
  if (current === 'on-order' && quantity <= reorderLevel) return 'on-order';
  if (quantity <= 0) return 'out-of-stock';
  if (quantity <= reorderLevel) return 'low-stock';
  return 'in-stock';
}
