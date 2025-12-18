import { CateringEvent, InventoryItem, ItemCategory, EventStatus, CATEGORY_BUFFER_DAYS, User, UserRole } from '../types';

const STORAGE_KEYS = {
  INVENTORY: 'caterlogix_inventory',
  EVENTS: 'caterlogix_events',
  CURRENT_USER: 'caterlogix_current_user'
};

// Mock Users Database
const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alice Nováková', role: UserRole.MANAGER, avatarUrl: 'https://ui-avatars.com/api/?name=Alice+Novakova&background=6366f1&color=fff' },
  { id: 'u2', name: 'Bob Dvořák', role: UserRole.MANAGER, avatarUrl: 'https://ui-avatars.com/api/?name=Bob+Dvorak&background=8b5cf6&color=fff' },
  { id: 'u3', name: 'Karel Skladník', role: UserRole.WAREHOUSE, avatarUrl: 'https://ui-avatars.com/api/?name=Karel+Skladnik&background=10b981&color=fff' },
];

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: '1', name: 'Bistro stůl vysoký', category: ItemCategory.FURNITURE, totalQuantity: 20, imageUrl: 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=200&q=80' },
  { id: '2', name: 'Rautový stůl 180cm', category: ItemCategory.FURNITURE, totalQuantity: 10, imageUrl: 'https://images.unsplash.com/photo-1577140917170-285929fb55b7?auto=format&fit=crop&w=200&q=80' },
  { id: '3', name: 'Židle Chiavari', category: ItemCategory.FURNITURE, totalQuantity: 100, imageUrl: 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=200&q=80' },
  { id: '4', name: 'Sklenice na víno 350ml', category: ItemCategory.DISHES, totalQuantity: 200, imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=200&q=80' },
  { id: '5', name: 'Talíř mělký 27cm', category: ItemCategory.DISHES, totalQuantity: 200, imageUrl: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=200&q=80' },
  { id: '6', name: 'Příborový set', category: ItemCategory.DISHES, totalQuantity: 200, imageUrl: 'https://images.unsplash.com/photo-1584346133934-a3afd2a5d246?auto=format&fit=crop&w=200&q=80' },
  { id: '7', name: 'Ubrus bílý', category: ItemCategory.OTHER, totalQuantity: 50, imageUrl: 'https://images.unsplash.com/photo-1593000956405-01e4a22e93b2?auto=format&fit=crop&w=200&q=80' },
];

export const AuthService = {
  getAvailableUsers: () => MOCK_USERS,
  
  login: (userId: string): User | null => {
    const user = MOCK_USERS.find(u => u.id === userId);
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return user;
    }
    return null;
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return stored ? JSON.parse(stored) : null;
  }
};

export const StorageService = {
  getInventory: (): InventoryItem[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(INITIAL_INVENTORY));
      return INITIAL_INVENTORY;
    }
    return JSON.parse(stored);
  },

  updateInventory: (items: InventoryItem[]) => {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
  },

  saveInventoryItem: (item: InventoryItem) => {
    // Reload to avoid race conditions in simple localStorage implementation
    const items = StorageService.getInventory();
    const index = items.findIndex(i => i.id === item.id);
    if (index >= 0) {
      items[index] = item;
    } else {
      items.push(item);
    }
    StorageService.updateInventory(items);
  },

  deleteInventoryItem: (id: string) => {
    const items = StorageService.getInventory();
    const filtered = items.filter(i => i.id !== id);
    StorageService.updateInventory(filtered);
  },

  getEvents: (): CateringEvent[] => {
    const stored = localStorage.getItem(STORAGE_KEYS.EVENTS);
    if (!stored) return [];
    return JSON.parse(stored);
  },

  saveEvents: (events: CateringEvent[]) => {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  },

  addEvent: (event: CateringEvent) => {
    // Ensure we have the latest state
    const events = StorageService.getEvents();
    
    // Attach current user info if available and not present
    if (!event.createdById) {
      const currentUser = AuthService.getCurrentUser();
      if (currentUser) {
        event.createdById = currentUser.id;
        event.createdByName = currentUser.name;
      }
    }
    
    events.push(event);
    StorageService.saveEvents(events);
  },

  updateEvent: (updatedEvent: CateringEvent) => {
    const events = StorageService.getEvents();
    const index = events.findIndex(e => e.id === updatedEvent.id);
    if (index !== -1) {
      events[index] = updatedEvent;
      StorageService.saveEvents(events);
    }
  },

  // Calculates stats for "Now"
  getItemStats: (itemId: string) => {
    const inventory = StorageService.getInventory();
    const item = inventory.find(i => i.id === itemId);
    if (!item) return { total: 0, onAction: 0, available: 0 };

    const events = StorageService.getEvents();
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize today

    let onAction = 0;

    events.forEach(event => {
      // Ignore Drafts and Returned (Closed) events
      if (event.status === EventStatus.PLANNED || event.status === EventStatus.RETURNED) return;

      const start = new Date(event.startDate);
      const end = new Date(event.endDate);

      // Check if event is active "Right Now"
      if (now >= start && now <= end) {
         const evItem = event.items.find(i => i.itemId === itemId);
         if (evItem) {
           onAction += evItem.quantity;
         }
      }
    });

    return {
      total: item.totalQuantity,
      onAction: onAction,
      available: Math.max(0, item.totalQuantity - onAction)
    };
  },

  // Future Availability Logic for Planning
  checkAvailability: (itemId: string, startDateStr: string, endDateStr: string, currentEventId?: string): number => {
    const inventory = StorageService.getInventory();
    const item = inventory.find(i => i.id === itemId);
    if (!item) return 0;

    const events = StorageService.getEvents();
    const reqStart = new Date(startDateStr).getTime();
    const reqEnd = new Date(endDateStr).getTime();
    const bufferDays = CATEGORY_BUFFER_DAYS[item.category] || 0;
    const bufferMs = bufferDays * 24 * 60 * 60 * 1000;

    let reservedQuantity = 0;

    for (const event of events) {
      if (currentEventId && event.id === currentEventId) continue;
      if (event.status === EventStatus.RETURNED) continue;
      if (event.status !== EventStatus.RESERVED && event.status !== EventStatus.ISSUED) continue;

      const evStart = new Date(event.startDate).getTime();
      let evEnd = new Date(event.endDate).getTime();
      const blockingEnd = evEnd + bufferMs;

      if (reqStart <= blockingEnd && evStart <= reqEnd) {
        const eventItem = event.items.find(i => i.itemId === itemId);
        if (eventItem) {
          reservedQuantity += eventItem.quantity;
        }
      }
    }

    return Math.max(0, item.totalQuantity - reservedQuantity);
  },

  closeEvent: (event: CateringEvent) => {
    const inventory = StorageService.getInventory();
    event.items.forEach(evItem => {
      const invItemIndex = inventory.findIndex(i => i.id === evItem.itemId);
      if (invItemIndex !== -1) {
        const item = inventory[invItemIndex];
        const issued = evItem.quantity;
        const returnedGood = evItem.returnedQuantity || 0;
        const loss = issued - returnedGood;
        if (loss > 0) {
          item.totalQuantity = Math.max(0, item.totalQuantity - loss);
        }
      }
    });

    StorageService.updateInventory(inventory);
    event.status = EventStatus.RETURNED;
    StorageService.updateEvent(event);
  }
};