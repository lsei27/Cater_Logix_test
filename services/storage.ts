import { CateringEvent, InventoryItem, ItemCategory, EventStatus, CATEGORY_BUFFER_DAYS, User, UserRole } from '../types';

const STORAGE_KEYS = {
  PROJECT_ID: 'caterlogix_project_id',
  CURRENT_USER: 'caterlogix_current_user'
};
const LOCAL_CACHE_KEY = 'caterlogix_cache';

const BLOB_API_URL = 'https://jsonblob.com/api/jsonBlob';
// Primary Proxy
const PROXY_URL = 'https://corsproxy.io/?'; 
// Backup Proxy (if primary fails to return headers or connect)
const BACKUP_PROXY_URL = 'https://thingproxy.freeboard.io/fetch/';

// Mock Users Database
const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alice Nováková', role: UserRole.MANAGER, avatarUrl: 'https://ui-avatars.com/api/?name=Alice+Novakova&background=6366f1&color=fff' },
  { id: 'u2', name: 'Bob Dvořák', role: UserRole.MANAGER, avatarUrl: 'https://ui-avatars.com/api/?name=Bob+Dvorak&background=8b5cf6&color=fff' },
  { id: 'u3', name: 'Karel Skladník', role: UserRole.WAREHOUSE, avatarUrl: 'https://ui-avatars.com/api/?name=Karel+Skladnik&background=10b981&color=fff' },
];

export const AuthService = {
  getAvailableUsers: (): User[] => MOCK_USERS,

  login: (userId: string) => {
    const user = MOCK_USERS.find(u => u.id === userId);
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    }
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
};

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
let USE_PROXY = false;
let LISTENERS: (() => void)[] = [];

const notifyListeners = () => {
  LISTENERS.forEach(l => l());
};

const persistCacheLocally = () => {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(CACHE));
  } catch (err) {
    console.warn('Local cache persist failed', err);
  }
};

const loadCacheFromLocalStorage = (): boolean => {
  const stored = localStorage.getItem(LOCAL_CACHE_KEY);
  if (stored) {
    try {
      CACHE = normalizeCache(JSON.parse(stored));
      return true;
    } catch (err) {
      console.warn('Failed to parse local cache', err);
    }
  }
  return false;
};

let INIT_IN_FLIGHT: Promise<boolean> | null = null;

const parseLocalDateStart = (dateStr: string) => new Date(`${dateStr}T00:00:00`);
const parseLocalDateEnd = (dateStr: string) => new Date(`${dateStr}T23:59:59.999`);

function normalizeEvent(event: any): CateringEvent {
  const startDate = typeof event?.startDate === 'string' ? event.startDate : '';
  const endDate = typeof event?.endDate === 'string' ? event.endDate : '';

  return {
    id: typeof event?.id === 'string' ? event.id : '',
    name: typeof event?.name === 'string' ? event.name : '',
    startDate,
    endDate,
    location: typeof event?.location === 'string' ? event.location : '',
    deliveryDateTime: typeof event?.deliveryDateTime === 'string' ? event.deliveryDateTime : '',
    pickupDateTime: typeof event?.pickupDateTime === 'string' ? event.pickupDateTime : undefined,
    status: Object.values(EventStatus).includes(event?.status) ? event.status : EventStatus.PLANNED,
    items: Array.isArray(event?.items) ? event.items : [],
    notes: typeof event?.notes === 'string' ? event.notes : undefined,
    createdById: typeof event?.createdById === 'string' ? event.createdById : '',
    createdByName: typeof event?.createdByName === 'string' ? event.createdByName : ''
  };
}

function normalizeCache(data: any): AppData {
  const inventory = Array.isArray(data?.inventory) ? data.inventory : INITIAL_INVENTORY;
  const events = Array.isArray(data?.events) ? data.events.map(normalizeEvent) : [];
  const lastUpdated = typeof data?.lastUpdated === 'number' ? data.lastUpdated : Date.now();

  return { inventory, events, lastUpdated };
}

// --- ROBUST NETWORK FETCH ---
const robustFetch = async (url: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');

  const hasBody = options.body !== undefined && options.body !== null;
  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const defaultOptions: RequestInit = {
    ...options,
    mode: 'cors',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    headers
  };

  const tryRequest = async (targetUrl: string) => {
    const response = await fetch(targetUrl, defaultOptions);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    return response;
  };

  try {
    const target = USE_PROXY ? `${PROXY_URL}${encodeURIComponent(url)}` : url;
    return await tryRequest(target);
  } catch (directError) {
    if (USE_PROXY) throw directError;

    console.warn("Direct connection failed. Switching to Proxy Mode...");
    try {
      const proxyUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
      const response = await tryRequest(proxyUrl);
      USE_PROXY = true; 
      return response;
    } catch (proxyError) {
      console.error("Proxy connection also failed.", proxyError);
      throw proxyError;
    }
  }
};

const generateProjectId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `team_${crypto.randomUUID()}`;
  }
  return `team_${Date.now().toString(36)}`;
};

const createCloudSpace = async (initialData: AppData): Promise<string | null> => {
  const newId = generateProjectId();
  const baseUrl = `${BLOB_API_URL}/${newId}`;

  const tryPut = async (targetUrl: string, markProxy = false) => {
    const response = await fetch(targetUrl, {
      method: 'PUT',
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(initialData)
    });

    if (!response.ok) {
      throw new Error(`PUT failed ${response.status}`);
    }

    if (markProxy) {
      USE_PROXY = true;
    }
  };

  // 1) Try direct or auto-proxy via robustFetch (covers CORSProxy fallback)
  try {
    await robustFetch(baseUrl, { method: 'PUT', body: JSON.stringify(initialData) });
    return newId;
  } catch (err) {
    console.warn('Direct/primary creation failed', err);
  }

  // 2) Explicit fallback proxies (some proxies do not expose headers, but PUT works)
  const proxyTargets = [
    { url: `${PROXY_URL}${encodeURIComponent(baseUrl)}`, markProxy: true },
    { url: `${BACKUP_PROXY_URL}${baseUrl}`, markProxy: true }
  ];

  for (const target of proxyTargets) {
    try {
      await tryPut(target.url, target.markProxy);
      return newId;
    } catch (proxyErr) {
      console.warn('Proxy creation attempt failed', proxyErr);
    }
  }

  return null;
};

export const StorageService = {
  subscribe: (listener: () => void) => {
    LISTENERS.push(listener);
    return () => {
      LISTENERS = LISTENERS.filter(l => l !== listener);
    };
  },

  isConnected: () => IS_CONNECTED,
  isUsingProxy: () => USE_PROXY,

  getProjectId: () => localStorage.getItem(STORAGE_KEYS.PROJECT_ID),

  setProjectId: (id: string) => {
    localStorage.setItem(STORAGE_KEYS.PROJECT_ID, id);
    IS_CONNECTED = false;
  },

  // Initialize: Must succeed in Cloud or fail
  init: async (): Promise<boolean> => {
    if (INIT_IN_FLIGHT) return INIT_IN_FLIGHT;

    INIT_IN_FLIGHT = (async () => {
      const hasLocalCache = loadCacheFromLocalStorage();
      const projectId = StorageService.getProjectId();

      if (projectId) {
        // Trying to connect to existing ID
        if (projectId.startsWith('offline_')) {
            IS_CONNECTED = false;
            notifyListeners();
            return true; // Valid initialization for offline mode
        }

        try {
          const success = await StorageService.reload();
          if (success) {
            IS_CONNECTED = true;
            notifyListeners();
            return true;
          }
        } catch (e) {
          console.error("Init sync failed:", e);
        }

        if (hasLocalCache) {
          console.warn("Falling back to local cache while offline.");
          IS_CONNECTED = false;
          notifyListeners();
          return true;
        }
      } else {
        // Create new Cloud Storage
        try {
          const initialData: AppData = { 
              inventory: INITIAL_INVENTORY, 
              events: [],
              lastUpdated: Date.now()
          };
          let newId = await createCloudSpace(initialData);

          if (!newId) {
            console.warn("Failed to create cloud space after all attempts. Switching to Offline Mode.");
            newId = `offline_${Date.now()}`;
          }

          if (newId) {
            StorageService.setProjectId(newId);
            CACHE = initialData;
            persistCacheLocally();
            IS_CONNECTED = !newId.startsWith('offline_'); // Only connected if real cloud ID
            notifyListeners();
            return true;
          }
        } catch (e) {
          console.error("Creation critical failure:", e);
        }
      }
      
      // Final fallback if everything crashed
      IS_CONNECTED = false;
      notifyListeners();
      return false;
    })();

    try {
      return await INIT_IN_FLIGHT;
    } finally {
      INIT_IN_FLIGHT = null;
    }
  },

  // Pull latest data from cloud
  reload: async (): Promise<boolean> => {
    const projectId = StorageService.getProjectId();
    if (!projectId || projectId.startsWith('offline_')) return false;

    try {
      // Add cache buster
      const response = await robustFetch(`${BLOB_API_URL}/${projectId}?_t=${Date.now()}`);
      const cloudData = normalizeCache(await response.json());
      
      if (cloudData && Array.isArray(cloudData.inventory)) {
          const currentStr = JSON.stringify(CACHE);
          const cloudStr = JSON.stringify(cloudData);
          
          if (currentStr !== cloudStr) {
              CACHE = cloudData;
              persistCacheLocally();
              notifyListeners();
          }
          IS_CONNECTED = true;
          return true;
      }
    } catch (e) {
      console.error("Reload failed:", e);
      // We don't necessarily set IS_CONNECTED to false here to avoid UI flickering on temporary network blips
    }
    return false;
  },

  // Push local cache to cloud
  save: async () => {
    const projectId = StorageService.getProjectId();
    if (!projectId) return;

    // Optimistic Timestamp
    CACHE.lastUpdated = Date.now();

    // If offline mode, just notify listeners (data is in memory/localstorage technically via App state)
    if (projectId.startsWith('offline_')) {
        persistCacheLocally();
        notifyListeners();
        return;
    }

    try {
      await robustFetch(`${BLOB_API_URL}/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify(CACHE)
      });
      IS_CONNECTED = true;
      persistCacheLocally();
      notifyListeners();
    } catch (e) {
      console.error("Save failed", e);
      const wasConnected = IS_CONNECTED;
      IS_CONNECTED = false;
      notifyListeners();
      // Only alert if we thought we were online
      if (wasConnected) {
          alert("POZOR: Nepodařilo se uložit data do cloudu! Zkontrolujte připojení.");
      }
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

  getItemStats: (itemId: string) => {
    const item = CACHE.inventory.find(i => i.id === itemId);
    if (!item) return { total: 0, reserved: 0, issued: 0, available: 0 };

    const events = CACHE.events;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    let reserved = 0;
    let issued = 0;

    for (const event of events) {
      if (event.status === EventStatus.PLANNED || event.status === EventStatus.RETURNED) continue;

      const evItem = event.items.find(i => i.itemId === itemId);
      if (!evItem) continue;

      if (event.status === EventStatus.ISSUED) {
        issued += evItem.quantity;
        continue;
      }

      const bufferDays = CATEGORY_BUFFER_DAYS[item.category] || 0;
      const bufferMs = bufferDays * 24 * 60 * 60 * 1000;

      const start = parseLocalDateStart(event.startDate).getTime();
      const blockingEnd = parseLocalDateEnd(event.endDate).getTime() + bufferMs;

      if (todayTime >= start && todayTime <= blockingEnd) {
        reserved += evItem.quantity;
      }
    }

    return {
      total: item.totalQuantity,
      reserved: reserved,
      issued: issued,
      available: Math.max(0, item.totalQuantity - (reserved + issued))
    };
  },

  checkAvailability: (itemId: string, startDateStr: string, endDateStr: string, currentEventId?: string): number => {
    const item = CACHE.inventory.find(i => i.id === itemId);
    if (!item) return 0;

    const events = CACHE.events;
    
    const reqStart = parseLocalDateStart(startDateStr);
    const reqEnd = parseLocalDateEnd(endDateStr);

    const bufferDays = CATEGORY_BUFFER_DAYS[item.category] || 0;
    
    let minAvailability = item.totalQuantity;

    for (let d = new Date(reqStart); d <= reqEnd; d.setDate(d.getDate() + 1)) {
        let reservedOnDay = 0;
        const currentDayTime = d.getTime();

        for (const event of events) {
            if (currentEventId && event.id === currentEventId) continue;
            // IMPORTANT: PLANNED (Drafts) do not block, RETURNED are closed.
            if (event.status === EventStatus.RETURNED || event.status === EventStatus.PLANNED) continue;
            
            const evStart = parseLocalDateStart(event.startDate);
            const evEnd = parseLocalDateEnd(event.endDate);
            
            const bufferMs = bufferDays * 24 * 60 * 60 * 1000;
            const blockingEnd = evEnd.getTime() + bufferMs;

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
        const returned = evItem.returnedQuantity !== undefined ? evItem.returnedQuantity : issued;
        
        const loss = Math.max(0, issued - returned);
        
        if (loss > 0) {
          // Permanently deduct lost items from stock
          item.totalQuantity = Math.max(0, item.totalQuantity - loss);
        }
      }
    });

    event.status = EventStatus.RETURNED;
    
    const eventIndex = CACHE.events.findIndex(e => e.id === event.id);
    if (eventIndex !== -1) {
        CACHE.events[eventIndex] = event;
    }
    CACHE.inventory = inventory;

    await StorageService.save();
  }
};
