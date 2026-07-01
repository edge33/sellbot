import Breadcrumb from '@renderer/components/Breadcrumbs/Breadcrumb';
import ItemsTable from './components/ItemsTable';
import { Item } from '@shared/types';
import { useLoaderData, useNavigate } from 'react-router-dom';
import PrimaryButton from '@renderer/ui/buttons/PrimaryButton';
import { useMemo, useState } from 'react';

export const loader = async () => {
  return await window.getItems();
};

// Mappa veloce categoria → nome (sincronizzata con ItemsTable.getItemCategory)
const CATEGORY_NAMES: Record<string, string> = {
  '2': 'Auto', '3': 'Moto e scooter', '4': 'Veicoli commerciali', '5': 'Accessori auto',
  '10': 'Informatica', '11': 'Audio e video', '12': 'Telefonia',
  '14': 'Arredamento', '15': 'Giardino', '16': 'Abbigliamento', '17': 'Bambini',
  '19': 'Musica e Film', '20': 'Sports', '21': 'Collezionismo', '22': 'Nautica', '23': 'Animali',
  '34': 'Caravan e Camper', '36': 'Accessori moto', '37': 'Elettrodomestici',
  '38': 'Libri e Riviste', '39': 'Strumenti Musicali', '40': 'Fotografia',
  '41': 'Biciclette', '44': 'Console e videogiochi', '100': 'Accessori animali'
};

const Products = () => {
  const itemsData = useLoaderData();
  const navigate = useNavigate();
  // Gli annunci archiviati (venduti) non compaiono nella dashboard principale
  const items = ((itemsData ?? []) as Item[]).filter((i) => !i.archived);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // --- Statistiche aggregate (su TUTTI gli annunci, non filtrati) ---
  const stats = useMemo(() => {
    const total = items.length;
    const online = items.filter((i) => i.isOnline === true).length;
    const offline = items.filter((i) => i.isOnline === false).length;
    const unknown = total - online - offline;
    const totalViews = items.reduce((sum, i) => sum + (i.stats?.views ?? 0), 0);
    const totalMessages = items.reduce((sum, i) => sum + (i.stats?.messages ?? 0), 0);
    // Posizione media (solo online con position numerica)
    const positions = items
      .filter((i) => i.isOnline && i.stats?.position)
      .map((i) => parseInt((i.stats?.position ?? '').replace('°', '')))
      .filter((n) => !isNaN(n));
    const avgPosition = positions.length > 0
      ? (positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(1)
      : null;
    return { total, online, offline, unknown, totalViews, totalMessages, avgPosition };
  }, [items]);

  // --- Categorie presenti per il filtro ---
  const presentCategories = useMemo(() => {
    const set = new Set(items.map((i) => i.category).filter(Boolean));
    return Array.from(set).sort((a, b) => (CATEGORY_NAMES[a] || a).localeCompare(CATEGORY_NAMES[b] || b));
  }, [items]);

  // --- Items filtrati ---
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (q && !i.title?.toLowerCase().includes(q)) return false;
      if (categoryFilter && i.category !== categoryFilter) return false;
      if (statusFilter === 'online' && i.isOnline !== true) return false;
      if (statusFilter === 'offline' && i.isOnline !== false) return false;
      if (statusFilter === 'unknown' && (i.isOnline === true || i.isOnline === false)) return false;
      return true;
    });
  }, [items, search, categoryFilter, statusFilter]);

  const StatCard = ({ label, value, accent }: { label: string; value: string | number; accent?: string }) => (
    <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-2xl font-semibold ${accent ?? 'text-black dark:text-white'}`}>{value}</p>
    </div>
  );

  return (
    <>
      <Breadcrumb pageName="Prodotti" />

      <div className="flex flex-col gap-6">
        {/* Statistiche aggregate */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          <StatCard label="Totali" value={stats.total} />
          <StatCard label="Online" value={stats.online} accent="text-success" />
          <StatCard label="Offline" value={stats.offline} accent="text-danger" />
          <StatCard label="Non controllati" value={stats.unknown} accent="text-gray-500" />
          <StatCard label="Visite totali" value={stats.totalViews} />
          <StatCard label="Messaggi" value={stats.totalMessages} />
        </div>

        {/* Filtri */}
        <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="🔍 Cerca per titolo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[200px] rounded border border-stroke bg-gray py-2 px-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded border border-stroke bg-gray py-2 px-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
            >
              <option value="">Tutte le categorie</option>
              {presentCategories.map((c) => (
                <option key={c} value={c}>{CATEGORY_NAMES[c] || c}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded border border-stroke bg-gray py-2 px-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
            >
              <option value="">Tutti gli stati</option>
              <option value="online">Solo online</option>
              <option value="offline">Solo offline</option>
              <option value="unknown">Non controllati</option>
            </select>
            {(search || categoryFilter || statusFilter) && (
              <button
                onClick={() => { setSearch(''); setCategoryFilter(''); setStatusFilter(''); }}
                className="text-sm text-primary hover:underline"
              >
                Pulisci filtri
              </button>
            )}
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
              {filteredItems.length} di {items.length} annunci
            </span>
          </div>
        </div>

        <ItemsTable items={filteredItems} />

        <div className="text-right">
          <PrimaryButton
            label="Nuovo oggetto"
            action={() => { navigate('/items/new-item/edit'); }}
          />
        </div>
      </div>
    </>
  );
};

export default Products;
