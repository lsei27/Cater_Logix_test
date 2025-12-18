import React, { useState, useEffect, useMemo } from 'react';
import { StorageService, AuthService } from './services/storage';
import { CateringEvent, EventStatus, InventoryItem, EventItem, ItemCategory, CATEGORY_BUFFER_DAYS, User, UserRole } from './types';

// Icons
const Icons = {
  Box: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>,
  Calendar: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>,
  Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  Truck: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>,
  Alert: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>,
  Edit: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>,
  Download: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Image: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>,
  User: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>,
  Logout: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>,
  Upload: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>,
  Cloud: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>,
  Share: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>,
  Shield: () => <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
  History: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"></path><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"></path></svg>
};

// --- Helper Functions ---

const downloadEventCSV = (event: CateringEvent, inventory: InventoryItem[]) => {
  const headers = ['Položka', 'Kategorie', 'Množství'];
  
  const rows = event.items.map(item => {
    const inventoryItem = inventory.find(i => i.id === item.itemId);
    return [
      inventoryItem ? inventoryItem.name : 'Neznámá položka',
      inventoryItem ? inventoryItem.category : '',
      item.quantity
    ];
  });

  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.join(';'))
  ].join('\n');

  const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${event.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_balici_list.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const StatusBadge = ({ status }: { status: EventStatus }) => {
  const styles = {
    [EventStatus.PLANNED]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [EventStatus.RESERVED]: 'bg-blue-100 text-blue-800 border-blue-200',
    [EventStatus.ISSUED]: 'bg-purple-100 text-purple-800 border-purple-200',
    [EventStatus.RETURNED]: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {status}
    </span>
  );
};

// --- Login Component ---

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const users = AuthService.getAvailableUsers();
  const [projectIdInput, setProjectIdInput] = useState('');
  const [showConnect, setShowConnect] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleUserSelect = (userId: string) => {
    AuthService.login(userId);
    onLogin();
  };

  const handleConnect = async () => {
    if (projectIdInput.trim()) {
      setIsInitializing(true);
      setErrorMsg('');
      StorageService.setProjectId(projectIdInput.trim());
      
      const success = await StorageService.init();
      setIsInitializing(false);
      
      if (success) {
        setShowConnect(false);
        alert("Úspěšně připojeno k týmu!");
      } else {
        setErrorMsg("ID týmu nebylo nalezeno nebo selhalo připojení.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-200">
            <Icons.Box />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CaterLogix</h1>
          <p className="text-gray-500 mt-2">Vyberte uživatele pro přihlášení</p>
        </div>

        <div className="space-y-3">
          {users.map(user => (
            <button
              key={user.id}
              onClick={() => handleUserSelect(user.id)}
              className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
            >
              <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full mr-4" />
              <div className="text-left flex-1">
                <div className="font-medium text-gray-900 group-hover:text-indigo-700">{user.name}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide">
                  {user.role === UserRole.MANAGER ? 'Event Manažer' : 'Skladník'}
                </div>
              </div>
              <div className="text-gray-300 group-hover:text-indigo-500">→</div>
            </button>
          ))}
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-100">
           <button 
             onClick={() => setShowConnect(!showConnect)}
             className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center justify-center gap-1 w-full"
           >
             <Icons.Cloud /> {showConnect ? 'Skrýt nastavení' : 'Připojit k existujícímu týmu'}
           </button>
           
           {showConnect && (
             <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
               <label className="block text-xs text-gray-600 mb-1">ID Týmu</label>
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   value={projectIdInput}
                   onChange={e => setProjectIdInput(e.target.value)}
                   className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
                   placeholder="Vložte ID..."
                   disabled={isInitializing}
                 />
                 <button 
                   onClick={handleConnect}
                   disabled={isInitializing}
                   className="bg-indigo-600 text-white text-xs px-3 py-1 rounded hover:bg-indigo-700 disabled:opacity-50"
                 >
                   {isInitializing ? '...' : 'Uložit'}
                 </button>
               </div>
               {errorMsg && <p className="text-xs text-red-500 mt-2">{errorMsg}</p>}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

// --- Main App Component ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [events, setEvents] = useState<CateringEvent[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isProxy, setIsProxy] = useState(false);
  
  // Navigation State
  const [view, setView] = useState<'LIST' | 'CREATE_EVENT' | 'EDIT_EVENT' | 'INVENTORY_LIST' | 'INVENTORY_EDIT' | 'EVENT_PROCESS'>('LIST');
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [activeInventoryId, setActiveInventoryId] = useState<string | null>(null);

  // Initialize
  useEffect(() => {
    const initApp = async () => {
      setIsLoading(true);
      setIsError(false);

      const urlParams = new URLSearchParams(window.location.search);
      const teamIdFromUrl = urlParams.get('teamId');
      if (teamIdFromUrl) {
        StorageService.setProjectId(teamIdFromUrl);
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      const success = await StorageService.init();
      
      if (success) {
        const user = AuthService.getCurrentUser();
        if (user) {
            setCurrentUser(user);
        }
        setProjectId(StorageService.getProjectId());
        setIsOnline(StorageService.isConnected());
        setIsProxy(StorageService.isUsingProxy());
        refreshData();
        setIsLoading(false);
      } else {
         setIsError(true);
         setIsLoading(false);
      }
    };
    initApp();

    const unsubscribe = StorageService.subscribe(() => {
        refreshData();
        setIsOnline(StorageService.isConnected());
        setIsProxy(StorageService.isUsingProxy());
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser || !projectId) return;
    // Fast polling for realtime feel
    const interval = setInterval(async () => {
      await StorageService.reload();
    }, 2000); 
    return () => clearInterval(interval);
  }, [currentUser, projectId]);

  const refreshData = () => {
    setEvents(StorageService.getEvents().sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
    setInventory(StorageService.getInventory());
  };

  useEffect(() => {
    if (currentUser) {
      refreshData();
    }
  }, [view, currentUser]);

  const handleLogout = () => {
    AuthService.logout();
    setCurrentUser(null);
    setView('LIST');
    setActiveEventId(null);
  };

  const handleShare = () => {
    if (!projectId) return;
    const url = `${window.location.origin}${window.location.pathname}?teamId=${projectId}`;
    navigator.clipboard.writeText(url).then(() => {
      alert("Odkaz na váš tým byl zkopírován do schránky. Pošlete ho kolegům.");
    });
  };

  const retryConnection = () => {
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Startuji CaterLogix...</p>
          <p className="text-xs text-gray-400 mt-2">Zkouším přímé připojení a proxy...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                    <Icons.Alert />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Chyba připojení</h2>
                <p className="text-gray-500 mb-6">
                    Ani po několika pokusech se nepodařilo spojit se serverem.
                    <br/><br/>
                    Aplikace vyžaduje aktivní internetové připojení pro synchronizaci dat.
                </p>
                <button 
                    onClick={retryConnection}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-medium"
                >
                    Zkusit znovu
                </button>
            </div>
        </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={() => setCurrentUser(AuthService.getCurrentUser())} />;
  }

  const inventoryViewProps = {
    inventory,
    onAdd: () => { setActiveInventoryId(null); setView('INVENTORY_EDIT'); },
    onEdit: (id: string) => { setActiveInventoryId(id); setView('INVENTORY_EDIT'); },
    onDelete: async (id: string) => {
      if(window.confirm('Opravdu smazat tuto položku z inventáře?')) {
        await StorageService.deleteInventoryItem(id);
        refreshData();
      }
    }
  };

  if (view === 'INVENTORY_EDIT') {
    const existingItem = activeInventoryId ? inventory.find((i: any) => i.id === activeInventoryId) : null;
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 p-4">
           <div className="max-w-7xl mx-auto flex items-center gap-3">
             <div className="bg-indigo-600 p-2 rounded-lg text-white"><Icons.Box /></div>
             <h1 className="text-xl font-bold text-gray-900">CaterLogix</h1>
           </div>
        </header>
        <div className="p-8">
          <InventoryEditor 
            initialData={existingItem}
            onCancel={() => setView('LIST')}
            onSave={() => {
              setView('LIST');
              refreshData();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Icons.Box />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-none">CaterLogix</h1>
              <div className="flex items-center gap-2 mt-0.5">
                  <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1" title="ID Týmu">
                    ID: {projectId?.slice(0, 8)}...
                  </div>
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                      {isOnline ? 'Online' : 'Offline'}
                  </div>
                  {isProxy && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-600" title="Připojeno přes Proxy (Bezpečný režim)">
                         <Icons.Shield /> Proxy
                      </div>
                  )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {projectId && (
               <button 
                 onClick={handleShare}
                 className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full hover:bg-indigo-100 transition-colors border border-indigo-100"
                 title="Zkopírovat odkaz pro kolegy"
               >
                 <Icons.Share /> Pozvat kolegy
               </button>
             )}
             <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
               <img src={currentUser.avatarUrl} alt="" className="w-8 h-8 rounded-full bg-gray-200" />
               <div className="hidden md:block">
                 <div className="text-sm font-medium text-gray-900 leading-none">{currentUser.name}</div>
                 <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">
                   {currentUser.role === UserRole.MANAGER ? 'Event Manager' : 'Sklad'}
                 </div>
               </div>
             </div>
             <button 
               onClick={handleLogout}
               className="p-2 text-gray-500 hover:text-red-600 transition-colors"
               title="Odhlásit se"
             >
               <Icons.Logout />
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {currentUser.role === UserRole.MANAGER ? (
          <ManagerView 
            view={view} 
            setView={setView} 
            events={events} 
            inventory={inventory}
            activeEventId={activeEventId}
            setActiveEventId={setActiveEventId}
            onDataChange={refreshData}
            currentUser={currentUser}
            inventoryViewProps={inventoryViewProps}
          />
        ) : (
          <WarehouseView 
            view={view}
            setView={setView}
            events={events} 
            inventory={inventory}
            onDataChange={refreshData}
            inventoryViewProps={inventoryViewProps}
            activeEventId={activeEventId}
            setActiveEventId={setActiveEventId}
          />
        )}
      </main>
    </div>
  );
}

// --- Manager Views ---

function ManagerView({ view, setView, events, inventory, activeEventId, setActiveEventId, onDataChange, currentUser, inventoryViewProps }: any) {
  const [activeTab, setActiveTab] = useState<'EVENTS' | 'INVENTORY'>('EVENTS');
  const [eventFilter, setEventFilter] = useState<'ALL' | 'MINE'>('ALL');

  if (view === 'CREATE_EVENT' || view === 'EDIT_EVENT') {
    const existingEvent = activeEventId ? events.find((e: any) => e.id === activeEventId) : null;
    return (
      <EventEditor 
        initialData={existingEvent}
        inventory={inventory} 
        onCancel={() => setView('LIST')} 
        onSave={() => {
          setView('LIST');
          onDataChange();
        }} 
        currentUser={currentUser}
      />
    );
  }

  const displayedEvents = events.filter((e: CateringEvent) => {
    if (eventFilter === 'MINE') {
      return e.createdById === currentUser.id;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('EVENTS')}
          className={`py-4 px-6 font-medium text-sm focus:outline-none border-b-2 transition-colors ${
            activeTab === 'EVENTS' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Přehled Akcí
        </button>
        <button
          onClick={() => setActiveTab('INVENTORY')}
          className={`py-4 px-6 font-medium text-sm focus:outline-none border-b-2 transition-colors ${
            activeTab === 'INVENTORY' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Katalog & Sklad
        </button>
      </div>

      {activeTab === 'EVENTS' ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 bg-white p-1 rounded-lg border border-gray-200 w-fit">
               <button 
                 onClick={() => setEventFilter('ALL')}
                 className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    eventFilter === 'ALL' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
                 }`}
               >
                 Všechny akce
               </button>
               <button 
                 onClick={() => setEventFilter('MINE')}
                 className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    eventFilter === 'MINE' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
                 }`}
               >
                 Moje akce
               </button>
            </div>

            <button 
              onClick={() => { setActiveEventId(null); setView('CREATE_EVENT'); }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <span className="text-lg leading-none">+</span>
              Nová Akce
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayedEvents.map((event: CateringEvent) => {
               const isMyEvent = event.createdById === currentUser.id;
               
               return (
                <div key={event.id} className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col h-full ${isMyEvent ? 'border-indigo-100 ring-1 ring-indigo-50' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <StatusBadge status={event.status} />
                    {(event.status === EventStatus.PLANNED || event.status === EventStatus.RESERVED) && (
                      <button 
                        onClick={() => { setActiveEventId(event.id); setView('EDIT_EVENT'); }}
                        className="text-gray-400 hover:text-indigo-600 p-1"
                        title="Upravit akci"
                      >
                        <Icons.Edit />
                      </button>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">{event.name}</h3>
                  <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                     <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-medium">
                        {event.createdByName || 'Neznámý'}
                     </span>
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-2 mb-4">
                    <Icons.Calendar />
                    {new Date(event.startDate).toLocaleDateString('cs-CZ')} – {new Date(event.endDate).toLocaleDateString('cs-CZ')}
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex flex-col text-sm text-gray-600">
                        <span>Položek:</span>
                        <span className="font-medium">{event.items.reduce((acc: number, i: any) => acc + i.quantity, 0)} ks</span>
                    </div>
                    {event.items.length > 0 && (
                      <button
                        onClick={() => downloadEventCSV(event, inventory)}
                        className="text-gray-600 hover:text-indigo-600 flex items-center gap-1.5 text-xs font-semibold px-2 py-1.5 rounded-md hover:bg-gray-100 transition-colors border border-gray-200"
                        title="Stáhnout balící list (CSV)"
                      >
                        <Icons.Download /> Export
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {displayedEvents.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                {eventFilter === 'MINE' ? 'Nemáte žádné vlastní akce.' : 'Zatím žádné naplánované akce.'}
              </div>
            )}
          </div>
        </>
      ) : (
        <InventoryManager {...inventoryViewProps} />
      )}
    </div>
  );
}

function InventoryManager({ inventory, onAdd, onEdit, onDelete }: any) {
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | 'ALL'>('ALL');
  
  const filteredInventory = categoryFilter === 'ALL' 
    ? inventory 
    : inventory.filter((item: InventoryItem) => item.category === categoryFilter);

  const categories = ['ALL', ...Object.values(ItemCategory)];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventář</h2>
          <p className="text-gray-500 text-sm mt-1">Správa katalogu a skladových zásob</p>
        </div>
        <button 
          onClick={onAdd}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          Přidat Položku
        </button>
      </div>

      <div className="flex gap-2 pb-2">
        {categories.map((cat: any) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              categoryFilter === cat 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {cat === 'ALL' ? 'Vše' : cat}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Obrázek</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Název</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategorie</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-green-50 text-green-800">Ihneď volné</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-blue-50 text-blue-800" title="Rezervováno pro dnešní den">Rezervováno</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-purple-50 text-purple-800" title="Vydáno mimo sklad">Vydáno</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100 text-gray-800">Celkem</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akce</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredInventory.map((item: InventoryItem) => {
              const stats = StorageService.getItemStats(item.id);
              
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="h-10 w-10 rounded-md object-cover bg-gray-100" />
                    ) : (
                        <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center text-gray-400">
                          <Icons.Image />
                        </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 text-right">{stats.available} ks</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-medium">{stats.reserved > 0 ? stats.reserved + ' ks' : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 text-right font-medium">{stats.issued > 0 ? stats.issued + ' ks' : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-right bg-gray-50">{stats.total} ks</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                        <button onClick={() => onEdit(item.id)} className="text-indigo-600 hover:text-indigo-900 p-1"><Icons.Edit /></button>
                        <button onClick={() => onDelete(item.id)} className="text-red-600 hover:text-red-900 p-1"><Icons.Trash /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InventoryEditor({ initialData, onCancel, onSave }: any) {
  const [formData, setFormData] = useState<Partial<InventoryItem>>(
    initialData || {
      name: '',
      category: ItemCategory.FURNITURE,
      totalQuantity: 0,
      imageUrl: ''
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.totalQuantity === undefined) return;

    const item: InventoryItem = {
      id: initialData?.id || Date.now().toString(),
      name: formData.name,
      category: formData.category || ItemCategory.FURNITURE,
      totalQuantity: Number(formData.totalQuantity),
      imageUrl: formData.imageUrl
    };

    await StorageService.saveInventoryItem(item);
    onSave();
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">{initialData ? 'Upravit položku' : 'Nová položka'}</h2>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-500">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Název</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                    <select
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value as ItemCategory})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    >
                        {Object.values(ItemCategory).map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Množství na skladě</label>
                    <input 
                      required
                      type="number" 
                      min="0"
                      value={formData.totalQuantity}
                      onChange={e => setFormData({...formData, totalQuantity: parseInt(e.target.value) || 0})}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Obrázku (volitelné)</label>
                <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={formData.imageUrl || ''}
                      onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      placeholder="https://..."
                    />
                    {formData.imageUrl && (
                        <img src={formData.imageUrl} alt="Preview" className="h-10 w-10 rounded object-cover border border-gray-200" />
                    )}
                </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Zrušit</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700">Uložit</button>
            </div>
        </form>
    </div>
  );
}

function EventEditor({ initialData, inventory, onCancel, onSave, currentUser }: any) {
  const [formData, setFormData] = useState<Partial<CateringEvent>>(
    initialData || {
      name: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      status: EventStatus.PLANNED,
      items: [],
      notes: ''
    }
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ItemCategory | 'ALL'>('ALL');

  const handleAddItem = (inventoryItem: InventoryItem) => {
    const existing = formData.items?.find((i: EventItem) => i.itemId === inventoryItem.id);
    if (existing) return; // Already added

    const newItem: EventItem = { itemId: inventoryItem.id, quantity: 1 };
    setFormData({
        ...formData,
        items: [...(formData.items || []), newItem]
    });
  };

  const handleRemoveItem = (itemId: string) => {
      setFormData({
          ...formData,
          items: formData.items?.filter((i: EventItem) => i.itemId !== itemId) || []
      });
  };

  const handleQuantityChange = (itemId: string, qty: number, max: number) => {
      setFormData({
          ...formData,
          items: formData.items?.map((i: EventItem) => i.itemId === itemId ? { ...i, quantity: qty } : i) || []
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.startDate || !formData.endDate) return;

    const event: CateringEvent = {
        id: initialData?.id || Date.now().toString(),
        name: formData.name!,
        startDate: formData.startDate!,
        endDate: formData.endDate!,
        status: formData.status || EventStatus.PLANNED,
        items: formData.items || [],
        notes: formData.notes,
        createdById: initialData?.createdById || currentUser.id,
        createdByName: initialData?.createdByName || currentUser.name
    };

    if (initialData) {
        await StorageService.updateEvent(event);
    } else {
        await StorageService.addEvent(event);
    }
    onSave();
  };

  const availableInventory = inventory.filter((item: InventoryItem) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-120px)]">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
            <h2 className="text-lg font-bold text-gray-900">{initialData ? 'Upravit akci' : 'Naplánovat akci'}</h2>
            <div className="flex gap-2">
                <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded">Zrušit</button>
                <button onClick={handleSubmit} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow-sm">Uložit Akci</button>
            </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Left Panel: Event Details & Selected Items */}
            <div className="w-full md:w-1/3 border-r border-gray-200 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Název akce</label>
                        <input 
                           type="text" 
                           className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500" 
                           value={formData.name}
                           onChange={e => setFormData({...formData, name: e.target.value})}
                           placeholder="Svatba Novákovi..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                         <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Od</label>
                            <input 
                                type="date" 
                                className="w-full p-2 text-sm border border-gray-300 rounded"
                                value={formData.startDate}
                                onChange={e => setFormData({...formData, startDate: e.target.value})}
                            />
                         </div>
                         <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Do</label>
                            <input 
                                type="date" 
                                className="w-full p-2 text-sm border border-gray-300 rounded"
                                value={formData.endDate}
                                onChange={e => setFormData({...formData, endDate: e.target.value})}
                            />
                         </div>
                    </div>
                    <div>
                         <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                         <select 
                            className="w-full p-2 text-sm border border-gray-300 rounded"
                            value={formData.status}
                            onChange={e => setFormData({...formData, status: e.target.value as EventStatus})}
                         >
                            <option value={EventStatus.PLANNED}>Naplánováno (Draft)</option>
                            <option value={EventStatus.RESERVED}>Rezervováno (Blokuje sklad)</option>
                         </select>
                    </div>
                     <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Poznámky</label>
                        <textarea 
                           className="w-full p-2 text-sm border border-gray-300 rounded h-20" 
                           value={formData.notes || ''}
                           onChange={e => setFormData({...formData, notes: e.target.value})}
                        />
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                    <h3 className="font-medium text-sm text-gray-900 mb-2">Vybrané položky ({formData.items?.length})</h3>
                    <div className="space-y-2">
                        {formData.items?.length === 0 && <p className="text-xs text-gray-400 italic">Zatím žádné položky.</p>}
                        {formData.items?.map((item: EventItem) => {
                            const invItem = inventory.find((i: any) => i.id === item.itemId);
                            if (!invItem) return null;
                            const available = StorageService.checkAvailability(invItem.id, formData.startDate!, formData.endDate!, initialData?.id);
                            
                            const isOverbooked = item.quantity > available;

                            return (
                                <div key={item.itemId} className="bg-white p-2 rounded border border-gray-200 shadow-sm text-sm">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-medium text-gray-800">{invItem.name}</span>
                                        <button onClick={() => handleRemoveItem(item.itemId)} className="text-gray-400 hover:text-red-500">×</button>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="text-xs text-gray-500">
                                            Dostupné: <span className={isOverbooked ? "text-red-600 font-bold" : "text-green-600"}>{available}</span>
                                        </div>
                                        <input 
                                            type="number" 
                                            min="1"
                                            className={`w-20 p-1 text-right border rounded text-sm ${isOverbooked ? 'border-red-300 bg-red-50 text-red-900' : 'border-gray-300'}`}
                                            value={item.quantity}
                                            onChange={e => handleQuantityChange(item.itemId, parseInt(e.target.value) || 0, available)}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Right Panel: Item Picker */}
            <div className="flex-1 p-4 flex flex-col bg-white overflow-hidden">
                <div className="flex gap-2 mb-4">
                     <input 
                        type="text" 
                        placeholder="Hledat vybavení..." 
                        className="flex-1 p-2 border border-gray-300 rounded text-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                     />
                     <select 
                        className="p-2 border border-gray-300 rounded text-sm"
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value as any)}
                     >
                         <option value="ALL">Všechny kategorie</option>
                         {Object.values(ItemCategory).map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                </div>
                
                <div className="flex-1 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 gap-3 content-start">
                    {availableInventory.map((item: InventoryItem) => {
                         const available = StorageService.checkAvailability(item.id, formData.startDate!, formData.endDate!, initialData?.id);
                         const isAdded = formData.items?.some((i: EventItem) => i.itemId === item.id);

                         return (
                             <button 
                                key={item.id}
                                disabled={isAdded || available <= 0}
                                onClick={() => handleAddItem(item)}
                                className={`flex flex-col text-left p-3 rounded-lg border transition-all ${
                                    isAdded 
                                    ? 'border-indigo-200 bg-indigo-50 opacity-60' 
                                    : available <= 0 
                                      ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                                      : 'border-gray-200 hover:border-indigo-300 hover:shadow-md bg-white'
                                }`}
                             >
                                 <div className="flex items-start gap-3 mb-2">
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} className="w-10 h-10 rounded object-cover bg-gray-100" />
                                    ) : (
                                        <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400"><Icons.Box /></div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm text-gray-900 truncate" title={item.name}>{item.name}</div>
                                        <div className="text-xs text-gray-500">{item.category}</div>
                                    </div>
                                 </div>
                                 <div className="mt-auto flex justify-between items-center w-full">
                                    <div className="text-xs">
                                        Volno: <span className={available > 0 ? 'font-bold text-gray-700' : 'text-red-500'}>{available}</span>
                                        <span className="text-gray-400 mx-1">/</span>
                                        <span className="text-gray-400">{item.totalQuantity}</span>
                                    </div>
                                    {!isAdded && available > 0 && <span className="text-indigo-600 font-bold text-lg leading-none">+</span>}
                                 </div>
                             </button>
                         );
                    })}
                </div>
            </div>
        </div>
    </div>
  );
}

function WarehouseView({ view, setView, events, inventory, onDataChange, inventoryViewProps, activeEventId, setActiveEventId }: any) {
  const [activeTab, setActiveTab] = useState<'DISPATCH' | 'HISTORY' | 'INVENTORY'>('DISPATCH');
  
  // Filter events based on tab
  const activeEvents = events.filter((e: CateringEvent) => e.status !== EventStatus.RETURNED);
  const returnedEvents = events.filter((e: CateringEvent) => e.status === EventStatus.RETURNED);
  
  if (view === 'EVENT_PROCESS') {
     return (
         <WarehouseProcess 
            event={events.find((e:any) => e.id === activeEventId)} 
            inventory={inventory}
            onBack={() => { setView('LIST'); setActiveEventId(null); }}
            onSave={async () => {
                onDataChange();
                setView('LIST');
                setActiveEventId(null);
            }}
         />
     );
  }

  return (
    <div className="space-y-6">
       <div className="flex border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('DISPATCH')}
          className={`py-4 px-6 font-medium text-sm focus:outline-none border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'DISPATCH' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Expedice & Příjem
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`py-4 px-6 font-medium text-sm focus:outline-none border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'HISTORY' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Historie / Vráceno
        </button>
        <button
          onClick={() => setActiveTab('INVENTORY')}
          className={`py-4 px-6 font-medium text-sm focus:outline-none border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'INVENTORY' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Skladové zásoby
        </button>
      </div>

      {activeTab === 'INVENTORY' ? (
        <InventoryManager {...inventoryViewProps} />
      ) : activeTab === 'HISTORY' ? (
        <div className="space-y-4">
             <h2 className="text-lg font-bold text-gray-900">Ukončené a vrácené akce</h2>
             <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                 {returnedEvents.map((event: CateringEvent) => (
                      <div key={event.id} className="bg-gray-50 rounded-xl border border-gray-200 p-5 shadow-sm opacity-90 hover:opacity-100 transition-all">
                           <div className="flex justify-between items-start mb-3">
                                <StatusBadge status={event.status} />
                                <span className="text-xs font-mono text-gray-400">#{event.id.slice(-4)}</span>
                            </div>
                            <h3 className="font-bold text-gray-700 text-lg mb-1">{event.name}</h3>
                            <div className="text-sm text-gray-500 flex items-center gap-2 mb-4">
                                <Icons.Calendar />
                                {new Date(event.startDate).toLocaleDateString('cs-CZ')}
                            </div>
                            <div className="space-y-2 pt-4 border-t border-gray-200">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Položek:</span>
                                    <span className="font-medium">{event.items.reduce((a, b) => a + b.quantity, 0)} ks</span>
                                </div>
                                <div className="flex gap-2 mt-2">
                                     <button 
                                        onClick={() => downloadEventCSV(event, inventory)}
                                        className="flex-1 bg-white border border-gray-300 text-gray-600 px-2 py-1.5 rounded text-xs font-medium hover:bg-gray-100 flex items-center justify-center gap-1"
                                    >
                                        <Icons.Download /> CSV
                                    </button>
                                    <button 
                                        onClick={() => { setActiveEventId(event.id); setView('EVENT_PROCESS'); }}
                                        className="flex-1 bg-white border border-gray-300 text-gray-600 px-2 py-1.5 rounded text-xs font-medium hover:bg-gray-100 flex items-center justify-center gap-1"
                                    >
                                         <Icons.History /> Detail
                                    </button>
                                </div>
                            </div>
                      </div>
                 ))}
                 {returnedEvents.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                        Žádné ukončené akce v historii.
                    </div>
                )}
             </div>
        </div>
      ) : (
        <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Plánované akce (K vyřízení)</h2>
            <div className="grid gap-4 sm:grid-cols-2">
                {activeEvents.map((event: CateringEvent) => {
                    const isToday = new Date(event.startDate).toDateString() === new Date().toDateString();
                    
                    return (
                        <div key={event.id} className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-all ${isToday ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-gray-200'}`}>
                            <div className="flex justify-between items-start mb-3">
                                <StatusBadge status={event.status} />
                                <span className="text-xs font-mono text-gray-400">#{event.id.slice(-4)}</span>
                            </div>
                            <h3 className="font-bold text-gray-900 text-lg mb-1">{event.name}</h3>
                            <div className="text-sm text-gray-500 flex items-center gap-2 mb-4">
                                <Icons.Calendar />
                                {new Date(event.startDate).toLocaleDateString('cs-CZ')}
                                {isToday && <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">DNES</span>}
                            </div>
                            
                            <div className="space-y-2 pt-4 border-t border-gray-100">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Položek k přípravě:</span>
                                    <span className="font-medium">{event.items.reduce((a, b) => a + b.quantity, 0)} ks</span>
                                </div>
                                
                                <div className="flex gap-2 mt-4">
                                    <button 
                                        onClick={() => downloadEventCSV(event, inventory)}
                                        className="flex-1 bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
                                    >
                                        <Icons.Download /> Seznam
                                    </button>
                                    
                                    {event.status === EventStatus.RESERVED && (
                                        <button 
                                            onClick={() => { setActiveEventId(event.id); setView('EVENT_PROCESS'); }}
                                            className="flex-1 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center justify-center gap-2"
                                        >
                                            <Icons.Truck /> Vydat ze skladu
                                        </button>
                                    )}

                                    {event.status === EventStatus.ISSUED && (
                                        <button 
                                            onClick={() => { setActiveEventId(event.id); setView('EVENT_PROCESS'); }}
                                            className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2"
                                        >
                                            <Icons.Check /> Přijmout vratku
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {activeEvents.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                        Žádné aktivní akce k vyřízení.
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
}

function WarehouseProcess({ event, inventory, onBack, onSave }: any) {
    const [items, setItems] = useState<EventItem[]>(JSON.parse(JSON.stringify(event.items)));
    const isReturning = event.status === EventStatus.ISSUED;
    const isClosed = event.status === EventStatus.RETURNED;

    const handleReturnCount = (itemId: string, val: number) => {
        setItems(items.map(i => i.itemId === itemId ? { ...i, returnedQuantity: val } : i));
    };

    const handleProcess = async () => {
        if (isClosed) {
             onSave();
             return;
        }

        if (!isReturning) {
            // Issuing
            const updated = { ...event, status: EventStatus.ISSUED };
            await StorageService.updateEvent(updated);
        } else {
            // Returning
            const updated = { ...event, items: items };
            await StorageService.closeEvent(updated);
        }
        onSave();
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-120px)]">
             <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">
                        {isClosed ? 'Detail ukončené akce' : (isReturning ? 'Příjem vratky (Uzavření akce)' : 'Výdej ze skladu')}
                    </h2>
                    <p className="text-xs text-gray-500">{event.name}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={onBack} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded">Zpět</button>
                    {!isClosed && (
                        <button onClick={handleProcess} className={`px-4 py-1.5 text-sm text-white rounded shadow-sm ${isReturning ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                            {isReturning ? 'Uzavřít a naskladnit' : 'Potvrdit výdej'}
                        </button>
                    )}
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
                 <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Položka</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vydáno</th>
                            {(isReturning || isClosed) && (
                                <>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Vráceno OK</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rozbito/Ztraceno</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {items.map((item) => {
                             const invItem = inventory.find((i:any) => i.id === item.itemId);
                             return (
                                 <tr key={item.itemId}>
                                     <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                         {invItem?.name || 'Neznámá'}
                                     </td>
                                     <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                                         {item.quantity} ks
                                     </td>
                                     {(isReturning || isClosed) && (
                                         <>
                                             <td className="px-4 py-4 whitespace-nowrap text-right">
                                                 <input 
                                                    type="number" 
                                                    min="0"
                                                    max={item.quantity}
                                                    disabled={isClosed}
                                                    className={`w-20 border-gray-300 rounded text-right text-sm p-1 border ${isClosed ? 'bg-gray-100' : ''}`}
                                                    value={item.returnedQuantity ?? item.quantity} // Default to all returned OK
                                                    onChange={e => handleReturnCount(item.itemId, parseInt(e.target.value) || 0)}
                                                 />
                                             </td>
                                             <td className="px-4 py-4 whitespace-nowrap text-right">
                                                  <div className="text-sm text-red-600 font-medium">
                                                      {Math.max(0, item.quantity - (item.returnedQuantity ?? item.quantity))} ks
                                                  </div>
                                             </td>
                                         </>
                                     )}
                                 </tr>
                             );
                        })}
                    </tbody>
                 </table>
            </div>
        </div>
    );
}