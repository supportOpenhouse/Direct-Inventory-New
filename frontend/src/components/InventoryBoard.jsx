import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { CITIES, STAGE_DOT_COLOR, STAGES, stageLabel } from '../utils/format.js';
import InventoryTable from './InventoryTable.jsx';
import FilterPanel from './FilterPanel.jsx';
import AddInventoryModal from './AddInventoryModal.jsx';
import { IconFilter, IconPlus, IconReload, IconSearch } from './icons.jsx';

const PAGE_SIZE = 50;

/**
 * The classic board experience: city tabs, search, filters, stage count pills,
 * pagination and the expandable inventory table. Reused by Home's Table view
 * and (scoped) by stage-specific pages.
 *
 * `fixedStages` pins the view to a stage set and hides the stage pills (e.g.
 * the Rejected page). `showAdd` toggles the add-inventory button.
 */
export default function InventoryBoard({ fixedStages = null, showAdd = true, stageFilterable = true }) {
  const { user } = useAuth();
  const [qInput, setQInput] = useState('');
  const [qApplied, setQApplied] = useState('');
  const [city, setCity] = useState('');
  const [stageSel, setStageSel] = useState(() => new Set(fixedStages || []));
  const [sort, setSort] = useState({ field: 'smart', dir: 'desc' });
  const [page, setPage] = useState(0);

  const [filtersApplied, setFiltersApplied] = useState({});
  const [filterFormState, setFilterFormState] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ total: 0, by_stage: {} });

  const stages = fixedStages || STAGES;

  function makeParams() {
    const p = new URLSearchParams();
    if (qApplied) p.set('q', qApplied);
    if (city) p.set('city', city);
    const effectiveStages = stageSel.size > 0 ? Array.from(stageSel) : (fixedStages || []);
    if (effectiveStages.length) p.set('stage', effectiveStages.join(','));
    if (sort.field) { p.set('sort', sort.field); p.set('dir', sort.dir); }
    for (const [k, v] of Object.entries(filtersApplied)) p.set(k, String(v));
    return p;
  }

  async function refresh(cur = page) {
    setLoading(true);
    try {
      const params = makeParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(cur * PAGE_SIZE));
      const r = await api.get(`/api/inventory?${params}`);
      setItems(r.items); setTotal(r.total);
    } finally { setLoading(false); }
  }
  async function refreshCounts() {
    try {
      const params = makeParams();
      params.delete('stage'); // counts are per-stage
      const r = await api.get(`/api/inventory/counts?${params}`);
      setCounts(r);
    } catch { /* non-blocking */ }
  }

  useEffect(() => { setPage(0); refresh(0); refreshCounts(); /* eslint-disable-next-line */ }, [city, qApplied, stageSel, filtersApplied, sort.field, sort.dir]);
  useEffect(() => { refresh(page); /* eslint-disable-next-line */ }, [page]);

  function onSearch(e) { e?.preventDefault(); setQApplied(qInput.trim()); }
  function toggleStage(s) {
    setStageSel((prev) => { const n = new Set(prev); if (n.has(s)) n.delete(s); else n.add(s); return n; });
  }
  function patchItem(updated) { setItems((prev) => prev.map((it) => (it.oh_id === updated.oh_id ? { ...it, ...updated } : it))); }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filterCount = Object.keys(filtersApplied).length;

  return (
    <div>
      <div className="toolbar">
        <div className="city-tabs">
          <button className={!city ? 'tab tab-active' : 'tab'} onClick={() => setCity('')}>All</button>
          {CITIES.map((c) => <button key={c} className={city === c ? 'tab tab-active' : 'tab'} onClick={() => setCity(c)}>{c}</button>)}
        </div>
        <form className="search-form" onSubmit={onSearch}>
          <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search society, OH-ID, seller, locality…" />
          <button type="submit" className="btn-primary"><IconSearch size={16} /> Search</button>
          {qApplied && <button type="button" className="btn-ghost" onClick={() => { setQInput(''); setQApplied(''); }}>Clear</button>}
        </form>
        <button className="btn-ghost" onClick={() => setShowFilters(true)}><IconFilter size={16} /> Filters{filterCount ? ` (${filterCount})` : ''}</button>
        {filterCount > 0 && <button className="btn-link" onClick={() => { setFiltersApplied({}); setFilterFormState({}); }}>Reset</button>}
        <div className="toolbar-spacer" />
        {showAdd && <button className="btn-primary" onClick={() => setShowAddModal(true)}><IconPlus size={16} /> Add Inventory</button>}
      </div>

      {stageFilterable && (
        <div className="stage-counts">
          <button type="button" className={stageSel.size === 0 ? 'count-pill count-pill-active' : 'count-pill'} onClick={() => setStageSel(new Set(fixedStages || []))}>
            <div className="num">{counts.total}</div><div className="lbl">ALL</div>
          </button>
          {stages.map((s) => (
            <button key={s} type="button" className={stageSel.has(s) ? 'count-pill count-pill-active' : 'count-pill'} onClick={() => toggleStage(s)}>
              <div className="num" style={{ color: STAGE_DOT_COLOR[s] }}>{counts.by_stage?.[s] ?? 0}</div>
              <div className="lbl">{stageLabel(s).toUpperCase()}</div>
            </button>
          ))}
        </div>
      )}

      <div className="filtered-header">
        <span className="muted">Showing {items.length === 0 ? 0 : page * PAGE_SIZE + 1}–{page * PAGE_SIZE + items.length} of {total}</span>
        <span className="toolbar-spacer" />
        <button className="btn-ghost" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>← Prev</button>
        <span className="page-num">Page {page + 1} / {totalPages}</span>
        <button className="btn-ghost" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
        <button className="icon-btn" onClick={() => { refresh(page); refreshCounts(); }} disabled={loading} aria-label="Reload">
          <span className={`reload-icon ${loading ? 'reload-icon-spinning' : ''}`}><IconReload size={16} /></span>
        </button>
      </div>

      <InventoryTable items={items} loading={loading} role={user?.role} sort={sort} onSort={setSort} onUpdated={patchItem} />

      {showFilters && (
        <FilterPanel initial={filterFormState} defaultCity={city}
          onClose={() => setShowFilters(false)}
          onApply={(applied, form) => { setFiltersApplied(applied); setFilterFormState(form); setShowFilters(false); }} />
      )}
      {showAddModal && (
        <AddInventoryModal onClose={() => setShowAddModal(false)} onAdded={() => { setShowAddModal(false); refresh(0); refreshCounts(); }} />
      )}
    </div>
  );
}
