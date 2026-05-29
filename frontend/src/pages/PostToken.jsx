import { useMemo, useState } from 'react';
import { MOCK_PROPERTIES } from '../data/properties.js';
import PropertyKanban from '../components/property/PropertyKanban.jsx';
import PropertyTable from '../components/property/PropertyTable.jsx';
import PropertySummaryView from '../components/property/PropertySummaryView.jsx';
import { IconLeads, IconToken, IconRejected, IconFollowUp } from '../components/icons.jsx';

// Our Post Token page == the example's Pipeline: a Kanban board of acquisition
// deals across the post-token stages (with a summary fallback).
function Metric({ Icon, color, label, value }) {
  return (
    <div className="quad-card" style={{ '--qc': color, minHeight: 0, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="qh-ic" style={{ background: `${color}1a`, color }}><Icon size={18} /></span>
        <div><div className="st-num" style={{ fontSize: 26 }}>{value}</div><div className="st-lbl">{label}</div></div>
      </div>
    </div>
  );
}

export default function PostToken() {
  const [properties, setProperties] = useState(MOCK_PROPERTIES);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState('kanban');

  const onStageChange = (id, stage) => {
    setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, stage } : p)));
    setSelected((s) => (s?.id === id ? { ...s, stage } : s));
  };
  const onUpdate = (id, changes) => setProperties((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes, pipeline: { ...p.pipeline, ...changes.pipeline } } : p)));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? properties.filter((p) => `${p.sellerName} ${p.society} ${p.sellerPhone1}`.toLowerCase().includes(q)) : properties;
  }, [properties, search]);

  const m = useMemo(() => ({
    active: filtered.filter((p) => !['rejected', 'token_refunded'].includes(p.stage)).length,
    signed: filtered.filter((p) => p.stage === 'ama_signed').length,
    handover: filtered.filter((p) => p.stage === 'key_handover').length,
    rejected: filtered.filter((p) => ['rejected', 'token_refunded'].includes(p.stage)).length,
  }), [filtered]);

  return (
    <div>
      <div className="page-head">
        <div><h2>Post Token</h2><div className="ph-sub">Acquisition deals across the post-token pipeline.</div></div>
        <div className="page-head-spacer" />
        <div className="search-form" style={{ maxWidth: 240 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search deals…" />
        </div>
        <div className="view-toggle">
          <button className={view === 'kanban' ? 'on' : ''} onClick={() => setView('kanban')}>Kanban</button>
          <button className={view === 'detail' ? 'on' : ''} onClick={() => setView('detail')}>Detail</button>
          <button className={view === 'summary' ? 'on' : ''} onClick={() => setView('summary')}>Summary</button>
        </div>
      </div>

      <div className="home-quad" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 18 }}>
        <Metric Icon={IconLeads} color="#6366f1" label="Active Deals" value={m.active} />
        <Metric Icon={IconToken} color="#14b8a6" label="AMA Signed" value={m.signed} />
        <Metric Icon={IconFollowUp} color="#22c55e" label="Key Handover" value={m.handover} />
        <Metric Icon={IconRejected} color="#ef4444" label="Rejected" value={m.rejected} />
      </div>

      {view === 'kanban' && <PropertyKanban properties={filtered} onStageChange={onStageChange} selected={selected} onSelect={setSelected} onClose={() => setSelected(null)} />}
      {view === 'detail' && <PropertyTable properties={filtered} onUpdate={onUpdate} emptyTitle="No deals match the search" />}
      {view === 'summary' && <PropertySummaryView properties={filtered} onUpdate={onUpdate} />}
    </div>
  );
}
