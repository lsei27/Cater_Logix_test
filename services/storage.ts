import { CateringEvent, InventoryItem, ItemCategory, EventStatus, CATEGORY_BUFFER_DAYS, User, UserRole } from '../types';

const STORAGE_KEYS = {
  PROJECT_ID: 'caterlogix_project_id',
  CURRENT_USER: 'caterlogix_current_user',
  LOCAL_BACKUP: 'caterlogix_local_data'
};

const BLOB_API_URL = 'https://jsonblob.com/api/jsonBlob';

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

// In-memory cache to keep app fast while syncing
let CACHE = {
  inventory: [] as InventoryItem[],
  events: [] as CateringEvent[]
};

let IS_INITIALIZED = false;

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
  // --- CLOUD SYNC LOGIC ---

  getProjectId: () => localStorage.getItem(STORAGE_KEYS.PROJECT_ID),

  setProjectId: (id: string) => {
    localStorage.setItem(STORAGE_KEYS.PROJECT_ID, id);
    IS_INITIALIZED = false; // Force reload
  },

  // Initialize: Load from Cloud or Local Backup or Create New
  init: async (): Promise<boolean> => {
    if (IS_INITIALIZED) return true;

    // 1. Always load local backup first to ensure immediate data availability
    const localBackup = localStorage.getItem(STORAGE_KEYS.LOCAL_BACKUP);
    if (localBackup) {
      try {
        CACHE = JSON.parse(localBackup);
        IS_INITIALIZED = true;
      } catch (e) {
        console.error("Corrupt local data", e);
        CACHE = { inventory: INITIAL_INVENTORY, events: [] };
      }
    } else {
      CACHE = { inventory: INITIAL_INVENTORY, events: [] };
    }

    const projectId = StorageService.getProjectId();

    if (projectId) {
      // 2. Try to sync with cloud
      try {
        const response = await fetch(`${BLOB_API_URL}/${projectId}`, {
           headers: { 'Accept': 'application/json' }
        });
        if (response.ok) {
          const data = await response.json();
          CACHE = data;
          // Update local backup with fresh cloud data
          localStorage.setItem(STORAGE_KEYS.LOCAL_BACKUP, JSON.stringify(CACHE));
          IS_INITIALIZED = true;
          return true;
        } else {
          console.warn("Cloud load failed, using local backup.");
        }
      } catch (e) {
        console.warn("Network error during init, using local backup", e);
      }
    } else {
      // 3. Create new Cloud Storage
      try {
        const response = await fetch(BLOB_API_URL, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(CACHE)
        });

        if (response.ok) {
          const location = response.headers.get('Location');
          // Location header is usually full URL, we need the UUID at the end
          if (location) {
             const newId = location.split('/').pop();
             if (newId) {
               StorageService.setProjectId(newId);
             }
          }
        }
      } catch (e) {
        console.error("Failed to create cloud storage", e);
        // Continue with local data, user will be offline for now
      }
    }
    
    IS_INITIALIZED = true;
    return true;
  },

  sync: async () => {
    // 1. Always save to local storage immediately
    localStorage.setItem(STORAGE_KEYS.LOCAL_BACKUP, JSON.stringify(CACHE));

    // 2. Try to save to cloud
    const projectId = StorageService.getProjectId();
    if (!projectId) return;

    try {
      await fetch(`${BLOB_API_URL}/${projectId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(CACHE)
      });
    } catch (e) {
      console.error("Sync failed", e);
    }
  },

  // Reload data from cloud (for background sync)
  reload: async (): Promise<boolean> => {
    const projectId = StorageService.getProjectId();
    if (!projectId) return false;

    try {
      const response = await fetch(`${BLOB_API_URL}/${projectId}`, {
          headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        CACHE = data;
        localStorage.setItem(STORAGE_KEYS.LOCAL_BACKUP, JSON.stringify(CACHE));
        return true;
      }
    } catch (e) {
      // console.error("Background sync failed", e);
    }
    return false;
  },

  // --- DATA ACCESS ---

  getInventory: (): InventoryItem[] => {
    return CACHE.inventory || [];
  },

  updateInventory: async (items: InventoryItem[]) => {
    CACHE.inventory = items;
    await StorageService.sync();
  },

  saveInventoryItem: async (item: InventoryItem) => {
    const items = [...CACHE.inventory];
    const index = items.findIndex(i => i.id === item.id);
    if (index >= 0) {
      items[index] = item;
    } else {
      items.push(item);
    }
    await StorageService.updateInventory(items);
  },

  deleteInventoryItem: async (id: string) => {
    const items = CACHE.inventory.filter(i => i.id !== id);
    await StorageService.updateInventory(items);
  },

  getEvents: (): CateringEvent[] => {
    return CACHE.events || [];
  },

  updateEvents: async (events: CateringEvent[]) => {
    CACHE.events = events;
    await StorageService.sync();
  },

  addEvent: async (event: CateringEvent) => {
    // Attach current user info if available and not present
    if (!event.createdById) {
      const currentUser = AuthService.getCurrentUser();
      if (currentUser) {
        event.createdById = currentUser.id;
        event.createdByName = currentUser.name;
      }
    }
    
    const events = [...CACHE.events, event];
    await StorageService.updateEvents(events);
  },

  updateEvent: async (updatedEvent: CateringEvent) => {
    const events = [...CACHE.events];
    const index = events.findIndex(e => e.id === updatedEvent.id);
    if (index !== -1) {
      events[index] = updatedEvent;
      await StorageService.updateEvents(events);
    }
  },

  // Calculates stats for "Now" - Used for Dashboard
  getItemStats: (itemId: string) => {
    const item = CACHE.inventory.find(i => i.id === itemId);
    if (!item) return { total: 0, onAction: 0, available: 0 };

    const events = CACHE.events;
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize today

    let onAction = 0;

    events.forEach(event => {
      // Only count items physically out of warehouse (ISSUED) or actively RESERVED for today
      // Logic: If it is reserved for today, it is effectively not available for another walk-in reservation
      if (event.status !== EventStatus.RESERVED && event.status !== EventStatus.ISSUED) return;

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

  // Future Availability Logic for Planning (The "Duplication" preventer)
  // This logic correctly handles RESERVED items.
  checkAvailability: (itemId: string, startDateStr: string, endDateStr: string, currentEventId?: string): number => {
    const item = CACHE.inventory.find(i => i.id === itemId);
    if (!item) return 0;

    const events = CACHE.events;
    const reqStart = new Date(startDateStr).getTime();
    const reqEnd = new Date(endDateStr).getTime();
    const bufferDays = CATEGORY_BUFFER_DAYS[item.category] || 0;
    const bufferMs = bufferDays * 24 * 60 * 60 * 1000;

    let reservedQuantity = 0;

    for (const event of events) {
      if (currentEventId && event.id === currentEventId) continue;
      if (event.status === EventStatus.RETURNED || event.status === EventStatus.PLANNED) continue;
      
      // IMPORTANT: Matches RESERVED and ISSUED.
      // This ensures that even if warehouse hasn't clicked "Issue", the item is blocked.
      if (event.status !== EventStatus.RESERVED && event.status !== EventStatus.ISSUED) continue;

      const evStart = new Date(event.startDate).getTime();
      let evEnd = new Date(event.endDate).getTime();
      const blockingEnd = evEnd + bufferMs;

      // Check overlap
      if (reqStart <= blockingEnd && evStart <= reqEnd) {
        const eventItem = event.items.find(i => i.itemId === itemId);
        if (eventItem) {
          reservedQuantity += eventItem.quantity;
        }
      }
    }

    return Math.max(0, item.totalQuantity - reservedQuantity);
  },

  closeEvent: async (event: CateringEvent) => {
    // 1. Calculate losses and update inventory locally
    const inventory = [...CACHE.inventory];
    event.items.forEach(evItem => {
      const invItemIndex = inventory.findIndex(i => i.id === evItem.itemId);
      if (invItemIndex !== -1) {
        const item = inventory[invItemIndex];
        const issued = evItem.quantity;
        const returnedGood = evItem.returnedQuantity || 0;
        const loss = issued - returnedGood;
        if (loss > 0) {
          // Permanently subtract lost items
          item.totalQuantity = Math.max(0, item.totalQuantity - loss);
        }
      }
    });

    // 2. Update Event Status
    event.status = EventStatus.RETURNED;
    
    // 3. Sync everything
    CACHE.inventory = inventory;
    
    const events = [...CACHE.events];
    const evIndex = events.findIndex(e => e.id === event.id);
    if (evIndex !== -1) events[evIndex] = event;
    CACHE.events = events;

    await StorageService.sync();
  }
};