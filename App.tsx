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
  Upload: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
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
    [EventStatus.RETURNED]: 'bg-green-100 text-green-800 border-green-200',
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

  const handleUserSelect = (userId: string) => {
    AuthService.login(userId);
    onLogin();
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
        
        <div className="mt-8 text-center text-xs text-gray-400">
           Simulace autentizace pro demo účely
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
  
  // Navigation State
  const [view, setView] = useState<'LIST' | 'CREATE_EVENT' | 'EDIT_EVENT' | 'INVENTORY_LIST' | 'INVENTORY_EDIT'>('LIST');
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [activeInventoryId, setActiveInventoryId] = useState<string | null>(null);

  // Initialize
  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

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

  if (!currentUser) {
    return <LoginScreen onLogin={() => setCurrentUser(AuthService.getCurrentUser())} />;
  }

  // Common View Props for handling Add/Edit Inventory from anywhere
  const inventoryViewProps = {
    inventory,
    onAdd: () => { setActiveInventoryId(null); setView('INVENTORY_EDIT'); },
    onEdit: (id: string) => { setActiveInventoryId(id); setView('INVENTORY_EDIT'); },
    onDelete: (id: string) => {
      if(window.confirm('Opravdu smazat tuto položku z inventáře?')) {
        StorageService.deleteInventoryItem(id);
        refreshData();
      }
    }
  };

  // Handle Inventory Edit View Globally (since both roles can access it now)
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
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <Icons.Box />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight hidden sm:block">CaterLogix</h1>
          </div>
          
          <div className="flex items-center gap-4">
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

      {/* Main Content */}
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
          />
        )}
      </main>
    </div>
  );
}

// --- Manager Views ---

function ManagerView({ view, setView, events, inventory, activeEventId, setActiveEventId, onDataChange, currentUser, inventoryViewProps }: any) {
  
  // Tab Switcher for Managers
  const [activeTab, setActiveTab] = useState<'EVENTS' | 'INVENTORY'>('EVENTS');
  const [eventFilter, setEventFilter] = useState<'ALL' | 'MINE'>('ALL');

  // Handle specific views outside the tab logic
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

  // Dashboard View with Tabs
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
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-orange-50 text-orange-800">Na akcích</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100 text-gray-800">Celkem</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akce</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredInventory.map((item: InventoryItem) => {
              // Calculate live stats
              const stats = StorageService.getItemStats(item.id);
              
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                     <div className="h-10 w-10 rounded-md bg-gray-100 overflow-hidden border border-gray-200">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400">
                             <Icons.Image />
                          </div>
                        )}
                     </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-green-700 bg-green-50/30">
                    {stats.available} ks
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-orange-600 bg-orange-50/30">
                    {stats.onAction} ks
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900 bg-gray-50/50">
                    {item.totalQuantity} ks
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                    <button onClick={() => onEdit(item.id)} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-1.5 rounded-md">
                      <Icons.Edit />
                    </button>
                    <button onClick={() => onDelete(item.id)} className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded-md">
                      <Icons.Trash />
                    </button>
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
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    name: '',
    category: ItemCategory.OTHER,
    totalQuantity: 0,
    imageUrl: '',
    ...initialData
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.totalQuantity === undefined) return;

    const itemToSave: InventoryItem = {
      id: initialData?.id || crypto.randomUUID(),
      name: formData.name,
      category: formData.category || ItemCategory.OTHER,
      totalQuantity: formData.totalQuantity,
      imageUrl: formData.imageUrl
    };

    StorageService.saveInventoryItem(itemToSave);
    onSave();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 max-w-2xl mx-auto">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
        <h3 className="text-lg font-bold text-gray-900">
          {initialData ? 'Upravit Položku' : 'Nová Položka'}
        </h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Název položky *</label>
          <input 
            type="text"
            required
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            placeholder="Např. Talíř hluboký"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
            <select
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2"
              value={formData.category}
              onChange={e => setFormData({...formData, category: e.target.value as ItemCategory})}
            >
              {Object.values(ItemCategory).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
               {formData.category === ItemCategory.DISHES ? 'Nádobí: +2 dny na úklid po akci.' : 
                formData.category === ItemCategory.FURNITURE ? 'Nábytek: Ihned k dispozici.' : 'Ostatní: +1 den buffer.'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Celkový počet (ks) *</label>
            <input 
              type="number"
              required
              min="0"
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2"
              value={formData.totalQuantity}
              onChange={e => setFormData({...formData, totalQuantity: parseInt(e.target.value) || 0})}
            />
          </div>
        </div>

        <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">Obrázek</label>
           
           <div className="space-y-3">
             {/* Local Upload */}
             <div className="flex items-center gap-3">
                <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2 shadow-sm">
                   <Icons.Upload /> Nahrát soubor
                   <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageUpload}
                   />
                </label>
                <span className="text-xs text-gray-400">nebo</span>
                {/* URL Input */}
                <input 
                  type="text"
                  className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2 text-sm"
                  value={formData.imageUrl || ''}
                  onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                  placeholder="Vložit URL obrázku..."
                />
             </div>
           </div>

           {formData.imageUrl && (
             <div className="mt-3 relative w-32 h-32 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 group">
               <img src={formData.imageUrl} alt="Náhled" className="w-full h-full object-cover" onError={(e) => (e.target as HTMLImageElement).src = ''} />
               <button 
                  type="button"
                  onClick={() => setFormData({...formData, imageUrl: ''})}
                  className="absolute top-1 right-1 bg-white/90 p-1 rounded-full text-gray-600 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
               >
                 <Icons.Trash />
               </button>
             </div>
           )}
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-6">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
            Zrušit
          </button>
          <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm">
            Uložit
          </button>
        </div>
      </form>
    </div>
  );
}

function EventEditor({ initialData, inventory, onCancel, onSave, currentUser }: any) {
  const [formData, setFormData] = useState<Partial<CateringEvent>>({
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    status: EventStatus.PLANNED,
    items: [],
    ...initialData
  });

  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'ALL'>('ALL');

  const updateItemQuantity = (itemId: string, qty: number) => {
    const currentItems = [...(formData.items || [])];
    const idx = currentItems.findIndex(i => i.itemId === itemId);
    
    if (qty <= 0) {
      if (idx !== -1) currentItems.splice(idx, 1);
    } else {
      if (idx !== -1) {
        currentItems[idx].quantity = qty;
      } else {
        currentItems.push({ itemId, quantity: qty });
      }
    }
    setFormData({ ...formData, items: currentItems });
  };

  const handleSave = (status: EventStatus) => {
    const eventToSave: CateringEvent = {
      id: initialData?.id || crypto.randomUUID(),
      name: formData.name!,
      startDate: formData.startDate!,
      endDate: formData.endDate!,
      status: status,
      items: formData.items || [],
      // Keep existing creator if editing, otherwise assign current user
      createdById: initialData?.createdById || currentUser.id,
      createdByName: initialData?.createdByName || currentUser.name
    };

    if (initialData) {
      StorageService.updateEvent(eventToSave);
    } else {
      StorageService.addEvent(eventToSave);
    }
    onSave();
  };

  const categories = ['ALL', ...Object.values(ItemCategory)];

  // Calculate availability for each item dynamically
  const inventoryWithAvailability = useMemo(() => {
    if (!formData.startDate || !formData.endDate) return inventory.map((i: any) => ({...i, available: i.totalQuantity}));
    
    return inventory.map((item: InventoryItem) => {
      const available = StorageService.checkAvailability(item.id, formData.startDate!, formData.endDate!, initialData?.id);
      return { ...item, available };
    });
  }, [inventory, formData.startDate, formData.endDate, initialData]);

  const filteredInventory = selectedCategory === 'ALL' 
    ? inventoryWithAvailability 
    : inventoryWithAvailability.filter((i: any) => i.category === selectedCategory);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="border-b border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">{initialData ? 'Upravit Akci' : 'Nová Akce'}</h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">Zavřít</button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Název akce</label>
            <input 
              type="text" 
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Např. Svatba Novákovi"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum od</label>
            <input 
              type="date" 
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2"
              value={formData.startDate}
              onChange={e => setFormData({...formData, startDate: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum do</label>
            <input 
              type="date" 
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2"
              value={formData.endDate}
              onChange={e => setFormData({...formData, endDate: e.target.value})}
            />
          </div>
        </div>
      </div>

      <div className="p-6 bg-gray-50 min-h-[400px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Výběr inventáře</h3>
          <div className="flex gap-2">
            {categories.map((cat: any) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedCategory === cat 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {cat === 'ALL' ? 'Vše' : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInventory.map((item: any) => {
            const inCart = formData.items?.find(i => i.itemId === item.id);
            const qty = inCart ? inCart.quantity : 0;
            const isOutOfStock = item.available <= 0 && qty === 0;

            return (
              <div key={item.id} className={`bg-white p-4 rounded-lg border shadow-sm flex gap-4 ${isOutOfStock ? 'opacity-60' : ''} ${qty > 0 ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-gray-200'}`}>
                <img src={item.imageUrl} alt={item.name} className="w-16 h-16 object-cover rounded-md bg-gray-100" />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-sm text-gray-900">{item.name}</h4>
                    {item.category === ItemCategory.DISHES && (
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded" title="Nutné mytí po akci (buffer +2 dny)">mytí</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Dostupné: <span className={`font-bold ${item.available < 10 ? 'text-red-600' : 'text-green-600'}`}>{item.available}</span> / {item.totalQuantity} ks
                  </p>
                  
                  <div className="mt-3 flex items-center">
                    <button 
                      onClick={() => updateItemQuantity(item.id, qty - 1)}
                      disabled={qty <= 0}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                    >-</button>
                    <input 
                      type="number" 
                      min="0"
                      max={item.available}
                      className="w-16 mx-2 text-center border-gray-300 rounded-md text-sm p-1"
                      value={qty}
                      onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                    />
                    <button 
                      onClick={() => updateItemQuantity(item.id, qty + 1)}
                      disabled={qty >= item.available}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
                    >+</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-6 border-t border-gray-200 flex justify-between items-center bg-gray-50">
        <div className="text-sm text-gray-500">
          Celkem položek: <span className="font-bold text-gray-900">{formData.items?.reduce((acc, i) => acc + i.quantity, 0)}</span>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => handleSave(EventStatus.PLANNED)}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Uložit jako koncept
          </button>
          <button 
            onClick={() => handleSave(EventStatus.RESERVED)}
            disabled={!formData.name || !formData.startDate}
            className="px-4 py-2 text-white bg-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Rezervovat
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Warehouse Views ---

function WarehouseView({ view, setView, events, inventory, onDataChange, inventoryViewProps }: any) {
  const [activeTab, setActiveTab] = useState<'TASKS' | 'INVENTORY'>('TASKS');
  const [selectedEvent, setSelectedEvent] = useState<CateringEvent | null>(null);
  const [mode, setMode] = useState<'ISSUE' | 'RETURN' | null>(null);

  // Filter only relevant events for warehouse
  const activeEvents = events.filter((e: CateringEvent) => 
    e.status === EventStatus.RESERVED || e.status === EventStatus.ISSUED
  );

  if (selectedEvent && mode) {
    return (
      <WarehouseAction 
        event={selectedEvent} 
        mode={mode} 
        inventory={inventory}
        onCancel={() => { setSelectedEvent(null); setMode(null); }}
        onComplete={() => {
          setSelectedEvent(null);
          setMode(null);
          onDataChange();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('TASKS')}
          className={`py-4 px-6 font-medium text-sm focus:outline-none border-b-2 transition-colors ${
            activeTab === 'TASKS' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Expedice & Příjem
        </button>
        <button
          onClick={() => setActiveTab('INVENTORY')}
          className={`py-4 px-6 font-medium text-sm focus:outline-none border-b-2 transition-colors ${
            activeTab === 'INVENTORY' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Správa Skladu
        </button>
      </div>

      {activeTab === 'TASKS' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stav</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akce</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Termín</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Položky</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akce skladu</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeEvents.map((event: CateringEvent) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={event.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{event.name}</div>
                    <div className="text-xs text-gray-500 mt-1">Vytvořil: {event.createdByName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(event.startDate).toLocaleDateString('cs-CZ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {event.items.length} typů
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {event.status === EventStatus.RESERVED && (
                      <button 
                        onClick={() => { setSelectedEvent(event); setMode('ISSUE'); }}
                        className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-3 py-1 rounded-md"
                      >
                        Vydat
                      </button>
                    )}
                    {event.status === EventStatus.ISSUED && (
                      <button 
                        onClick={() => { setSelectedEvent(event); setMode('RETURN'); }}
                        className="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1 rounded-md"
                      >
                        Příjem / Vrátit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {activeEvents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Žádné akce k výdeji ani příjmu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <InventoryManager {...inventoryViewProps} />
      )}
    </div>
  );
}

function WarehouseAction({ event, mode, inventory, onCancel, onComplete }: any) {
  // Deep copy items for editing
  const [items, setItems] = useState<EventItem[]>(JSON.parse(JSON.stringify(event.items)));

  const handleIssue = () => {
    // Save any qty adjustments
    const updatedEvent = { ...event, status: EventStatus.ISSUED, items };
    StorageService.updateEvent(updatedEvent);
    onComplete();
  };

  const handleReturn = () => {
    const updatedEvent = { ...event, items };
    // This calculates losses and updates main inventory
    StorageService.closeEvent(updatedEvent);
    onComplete();
  };

  const updateReturnCounts = (itemId: string, field: 'returnedQuantity' | 'brokenQuantity', val: number) => {
    const newItems = [...items];
    const idx = newItems.findIndex(i => i.itemId === itemId);
    if (idx !== -1) {
      newItems[idx][field] = val;
    }
    setItems(newItems);
  };

  const totalIssued = items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 max-w-4xl mx-auto">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {mode === 'ISSUE' ? 'Výdej inventáře' : 'Příjem vratky'}
          </h3>
          <p className="text-sm text-gray-500">{event.name}</p>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <div className="p-6">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 text-sm text-blue-800 flex gap-3">
          <Icons.Alert />
          <div>
            {mode === 'ISSUE' 
              ? 'Zkontrolujte počty položek. Pokud vydáváte jiné množství než bylo rezervováno, upravte číslo "Vydáno".'
              : 'Vyplňte počty vrácených (v pořádku) a rozbitých kusů. Chybějící kusy systém dopočítá automaticky.'
            }
          </div>
        </div>

        <div className="space-y-4">
          {items.map((item, idx) => {
            const invItem = inventory.find((i: any) => i.id === item.itemId);
            if (!invItem) return null;

            return (
              <div key={item.itemId} className="flex items-center p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                <img src={invItem.imageUrl} className="w-12 h-12 rounded object-cover mr-4 bg-gray-200" alt="" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{invItem.name}</h4>
                  <p className="text-xs text-gray-500">{invItem.category}</p>
                </div>

                {mode === 'ISSUE' ? (
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-gray-500 uppercase">K výdeji:</label>
                    <input 
                      type="number"
                      min="0"
                      className="w-20 border-gray-300 rounded-md p-1 text-center font-bold text-lg"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[idx].quantity = parseInt(e.target.value) || 0;
                        setItems(newItems);
                      }}
                    />
                    <span className="text-gray-500">ks</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Vydáno</div>
                      <div className="font-bold text-lg">{item.quantity}</div>
                    </div>
                    
                    <div className="flex flex-col">
                      <label className="text-xs text-green-600 font-bold mb-1">Vráceno (OK)</label>
                      <input 
                        type="number"
                        min="0"
                        className="w-24 border-green-300 focus:ring-green-500 rounded-md p-1 text-center"
                        value={item.returnedQuantity ?? item.quantity} // Default to full return
                        onChange={(e) => updateReturnCounts(item.itemId, 'returnedQuantity', parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="text-xs text-red-600 font-bold mb-1">Rozbito</label>
                      <input 
                        type="number"
                        min="0"
                        className="w-20 border-red-300 focus:ring-red-500 rounded-md p-1 text-center"
                        value={item.brokenQuantity ?? 0}
                        onChange={(e) => updateReturnCounts(item.itemId, 'brokenQuantity', parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div className="text-center w-16">
                      <div className="text-xs text-gray-400 mb-1">Chybí</div>
                      <div className="font-bold text-gray-400">
                        {Math.max(0, item.quantity - (item.returnedQuantity ?? item.quantity) - (item.brokenQuantity ?? 0))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3 border-t border-gray-200">
        <button onClick={onCancel} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100">
          Zrušit
        </button>
        {mode === 'ISSUE' ? (
          <button 
            onClick={handleIssue}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm flex items-center gap-2"
          >
            <Icons.Check /> Potvrdit Výdej ({totalIssued} ks)
          </button>
        ) : (
          <button 
            onClick={handleReturn}
            className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 shadow-sm flex items-center gap-2"
          >
            <Icons.Check /> Uzavřít a Naskladnit
          </button>
        )}
      </div>
    </div>
  );
}