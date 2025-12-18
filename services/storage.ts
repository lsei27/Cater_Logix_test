import { CateringEvent, InventoryItem, ItemCategory, EventStatus, CATEGORY_BUFFER_DAYS, User, UserRole } from '../types';

const STORAGE_KEYS = {
  PROJECT_ID: 'caterlogix_project_id',
  CURRENT_USER: 'caterlogix_current_user'
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

interface AppData {
  inventory: InventoryItem[];
  events: CateringEvent[];
  lastUpdated: number;
}

// In-memory cache
let CACHE: AppData = {
  inventory: INITIAL_INVENTORY,
  events: [],
  lastUpdated: Date.now()
};

let IS_CONNECTED = false;
let LISTENERS: (() => void)[] = [];

const notifyListeners = () => {
  LISTENERS.forEach(l => l());
};

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
  subscribe: (listener: () => void) => {
    LISTENERS.push(listener);
    return () => {
      LISTENERS = LISTENERS.filter(l => l !== listener);
    };
  },

  isConnected: () => IS_CONNECTED,

  getProjectId: () => localStorage.getItem(STORAGE_KEYS.PROJECT_ID),

  setProjectId: (id: string) => {
    localStorage.setItem(STORAGE_KEYS.PROJECT_ID, id);
    IS_CONNECTED = false;
  },

  // Initialize: Must succeed in Cloud or fail
  init: async (): Promise<boolean> => {
    const projectId = StorageService.getProjectId();

    if (projectId) {
      // Try to load existing
      try {
        const success = await StorageService.reload(); // Uses cache-busting
        if (success) {
          IS_CONNECTED = true;
          notifyListeners();
          return true;
        }
      } catch (e) {
        console.error("Init sync failed:", e);
      }
    } else {
      // Create new Cloud Storage
      try {
        const initialData: AppData = { 
            inventory: INITIAL_INVENTORY, 
            events: [],
            lastUpdated: Date.now()
        };
        
        const response = await fetch(BLOB_API_URL, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(initialData)
        });

        if (response.ok) {
          const location = response.headers.get('Location');
          if (location) {
             const newId = location.split('/').pop();
             if (newId) {
               StorageService.setProjectId(newId);
               CACHE = initialData;
               IS_CONNECTED = true;
               notifyListeners();
               return true;
             }
          } else {
             console.error("No Location header in response");
          }
        }
      } catch (e) {
        console.error("Creation failed:", e);
      }
    }
    
    IS_CONNECTED = false;
    notifyListeners();
    return false;
  },

  // Pull latest data from cloud
  reload: async (): Promise<boolean> => {
    const projectId = StorageService.getProjectId();
    if (!projectId) return false;

    try {
      // Add timestamp to prevent browser caching - CRITICAL for real-time
      const response = await fetch(`${BLOB_API_URL}/${projectId}?_t=${Date.now()}`, {
          headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const cloudData = await response.json();
        
        // Update cache if cloud has valid data structure
        if (cloudData && Array.isArray(cloudData.inventory)) {
            // Only notify if something actually changed (by comparing JSON string)
            const currentStr = JSON.stringify(CACHE);
            const cloudStr = JSON.stringify(cloudData);
            
            if (currentStr !== cloudStr) {
                CACHE = cloudData;
                notifyListeners();
            }
            IS_CONNECTED = true;
            return true;
        }
      }
    } catch (e) {
      console.error("Reload failed:", e);
    }
    
    // If we are here, something went wrong
    // Don't set IS_CONNECTED = false immediately on one failed poll to avoid flickering
    // but if it persists, UI will show last known state
    return false;
  },

  // Push local cache to cloud
  save: async () => {
    const projectId = StorageService.getProjectId();
    if (!projectId) {
        alert("Chyba: Chybí ID týmu. Zkuste obnovit stránku.");
        return;
    }

    // 1. First, fetch latest to ensure we don't overwrite others blindly (basic optimistic locking)
    try {
        const response = await fetch(`${BLOB_API_URL}/${projectId}?_t=${Date.now()}`);
        if (response.ok) {
            const cloudData = await response.json();
            // In a real app, we would merge. Here we assume "Last Save Wins" but we preserve other collections if needed
            // For now, we trust the current user's action is the truth for the entity they are editing
        }
    } catch (e) {
        // Ignore fetch error on save, try to push anyway
    }

    // 2. Update timestamp
    CACHE.lastUpdated = Date.now();

    try {
      const res = await fetch(`${BLOB_API_URL}/${projectId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(CACHE)
      });
      
      if (res.ok) {
        IS_CONNECTED = true;
        notifyListeners(); // Update UI
      } else {
        alert("Chyba při ukládání do cloudu! Zkontrolujte internet.");
        IS_CONNECTED = false;
      }
    } catch (e) {
      alert("Chyba při ukládání do cloudu! Zkontrolujte internet.");
      IS_CONNECTED = false;
    }
  },

  // --- DATA ACCESS ---

  getInventory: (): InventoryItem[] => {
    return CACHE.inventory || [];
  },

  updateInventory: async (items: InventoryItem[]) => {
    CACHE.inventory = items;
    await StorageService.save();
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
    await StorageService.save();
  },

  addEvent: async (event: CateringEvent) => {
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

  // Calculates stats for "Now" based on current CACHE
  getItemStats: (itemId: string) => {
    const item = CACHE.inventory.find(i => i.id === itemId);
    if (!item) return { total: 0, onAction: 0, available: 0 };

    const events = CACHE.events;
    // Use strict date comparison logic
    const now = new Date(); 
    now.setHours(0,0,0,0); // Comparison is day-based usually

    let onAction = 0;

    events.forEach(event => {
      // Items are "On Action" if event is RESERVED or ISSUED
      // AND current date is within range
      if (event.status !== EventStatus.RESERVED && event.status !== EventStatus.ISSUED) return;

      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);

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
      available: Math.max(0, item.totalQuantity - onAction) // Available logic for "Now"
    };
  },

  // Logic to prevent booking if already booked in future
  checkAvailability: (itemId: string, startDateStr: string, endDateStr: string, currentEventId?: string): number => {
    const item = CACHE.inventory.find(i => i.id === itemId);
    if (!item) return 0;

    const events = CACHE.events;
    
    // Convert inputs to Time for comparison
    const reqStart = new Date(startDateStr);
    reqStart.setHours(0,0,0,0);
    const reqEnd = new Date(endDateStr);
    reqEnd.setHours(23,59,59,999);

    const bufferDays = CATEGORY_BUFFER_DAYS[item.category] || 0;
    // Buffer is added AFTER the event end date
    
    let maxReservedQuantity = 0;

    // We need to find the specific day in the range [reqStart, reqEnd] with the MAXIMUM overlap
    // A simple sum is wrong because events might not overlap with each other, but both overlap with request.
    // Actually, for a specific item, we just need to subtract any confirmed event that overlaps with our range.
    // If multiple events overlap on the SAME day, we sum them.
    
    // Simplified robust algorithm:
    // 1. Iterate through every day of the requested period.
    // 2. For that day, sum up all quantities from overlapping events (including buffer).
    // 3. The lowest availability across all days is the result.

    let minAvailability = item.totalQuantity;

    // Create loop for days
    for (let d = new Date(reqStart); d <= reqEnd; d.setDate(d.getDate() + 1)) {
        let reservedOnDay = 0;
        
        const currentDayTime = d.getTime();

        for (const event of events) {
            if (currentEventId && event.id === currentEventId) continue;
            if (event.status === EventStatus.RETURNED || event.status === EventStatus.PLANNED) continue;
            // Matches RESERVED and ISSUED
            
            const evStart = new Date(event.startDate);
            evStart.setHours(0,0,0,0);
            
            const evEnd = new Date(event.endDate);
            evEnd.setHours(23,59,59,999);
            
            // Add buffer to event end
            const bufferMs = bufferDays * 24 * 60 * 60 * 1000;
            const blockingEnd = evEnd.getTime() + bufferMs;

            // Check if currentDay is inside [evStart, blockingEnd]
            if (currentDayTime >= evStart.getTime() && currentDayTime <= blockingEnd) {
                const eventItem = event.items.find(i => i.itemId === itemId);
                if (eventItem) {
                    reservedOnDay += eventItem.quantity;
                }
            }
        }
        
        const availOnDay = item.totalQuantity - reservedOnDay;
        if (availOnDay < minAvailability) {
            minAvailability = availOnDay;
        }
    }

    return Math.max(0, minAvailability);
  },

  closeEvent: async (event: CateringEvent) => {
    const inventory = [...CACHE.inventory];
    event.items.forEach(evItem => {
      const invItemIndex = inventory.findIndex(i => i.id === evItem.itemId);
      if (invItemIndex !== -1) {
        const item = inventory[invItemIndex];
        const issued = evItem.quantity;
        // If returned undefined, assume all returned ok if not broken specified? 
        // Logic: Manager fills returnedQuantity. 
        const returned = evItem.returnedQuantity !== undefined ? evItem.returnedQuantity : issued;
        
        // Loss is anything NOT returned. 
        // Note: Broken items are usually considered "returned but destroyed" or "missing".
        // The prompt says: "vráceno + rozbito (2 čísla)".
        // If user enters Returned: 10, Broken: 2. Issued was 12. OK.
        // If Issued 12, Returned 10. Missing 2.
        
        // We subtract Broken and Missing from Stock.
        const broken = evItem.brokenQuantity || 0; // If you add broken field later
        
        // Based on WarehouseProcess component: 
        // We only have `returnedQuantity` input. 
        // The difference (Issued - Returned) is considered LOST/BROKEN and removed from stock.
        
        const loss = Math.max(0, issued - returned);
        
        if (loss > 0) {
          item.totalQuantity = Math.max(0, item.totalQuantity - loss);
        }
      }
    });

    event.status = EventStatus.RETURNED;
    
    // Update local cache structure
    const eventIndex = CACHE.events.findIndex(e => e.id === event.id);
    if (eventIndex !== -1) {
        CACHE.events[eventIndex] = event;
    }
    CACHE.inventory = inventory;

    await StorageService.save();
  }
};