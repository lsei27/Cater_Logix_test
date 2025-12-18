
export enum ItemCategory {
  FURNITURE = 'Nábytek', // Volné hned
  DISHES = 'Nádobí', // Volné po mytí (buffer)
  OTHER = 'Ostatní'
}

export enum EventStatus {
  PLANNED = 'Naplánováno', // Draft
  RESERVED = 'Rezervováno', // Blokuje sklad
  ISSUED = 'Vydáno', // Na akci
  RETURNED = 'Vráceno' // Uzavřeno
}

export enum UserRole {
  MANAGER = 'MANAGER',
  WAREHOUSE = 'WAREHOUSE'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  totalQuantity: number;
  imageUrl?: string;
}

export interface EventItem {
  itemId: string;
  quantity: number;
  returnedQuantity?: number;
  brokenQuantity?: number;
}

export interface CateringEvent {
  id: string;
  name: string;
  startDate: string; // ISO Date string YYYY-MM-DD
  endDate: string;   // ISO Date string YYYY-MM-DD
  status: EventStatus;
  items: EventItem[];
  notes?: string;
  createdById: string;
  createdByName: string;
}

export const CATEGORY_BUFFER_DAYS: Record<ItemCategory, number> = {
  [ItemCategory.FURNITURE]: 0,
  [ItemCategory.DISHES]: 2, // 2 dny na mytí/úklid
  [ItemCategory.OTHER]: 1
};
