import { useEffect } from 'react';
import { formatCurrency, formatPropDate, PROPERTY_STAGES, STAGE_MAP } from '../../data/properties.js';
import { PropertyStatusPill } from './PropertyTable.jsx';
import { IconClose } from '../icons.jsx';

function KanbanCard({ p, onClick }) {
  return (
    <button type="button" className="kb-card" onClick={() => onClick(p)}>
      <div className="kb-card-name">{p.sellerName}</div>
      <div className="kb-card-soc">{p.society} · {p.config}</div>
      <div className="kb-card-price">{formatCurrency(p.acquisitionCost)}</div>
      <div className="kb-card-foot">
        <span>{p.city}</span>
        <span>{formatPropDate(p.tokenDate)}</span>
      </div>
    </button>
  );
}

function KanbanColumn({ stage, items, onCardClick }) {
  return (
    <div className="kb-col">
      <div className="kb-col-head">
        <span className="kb-col-title"><span className="kb-dot" style={{ background: stage.color }} />{stage.label}</span>
        <span className="kb-col-count">{items.length}</span>
      </div>
      <div className="kb-col-body">
        {items.length === 0 ? <div className="kb-empty">No deals</div> : items.map((p) => <KanbanCard key={p.id} p={p} onClick={onCardClick} />)}
      </div>
    </div>
  );
}

function DealDrawer({ deal, onClose, onStageChange }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!deal) return null;
  const Field = ({ label, value }) => <div className="field-row"><span className="field-lbl">{label}</span><span className="field-val">{value ?? '—'}</span></div>;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div>
            <h3>{deal.sellerName}</h3>
            <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}><PropertyStatusPill stage={deal.stage} /><span className="muted" style={{ fontSize: 12 }}>{deal.config}</span></div>
          </div>
          <button className="modal-close" onClick={onClose}><IconClose /></button>
        </div>
        <div className="sheet-body">
          <label>Pipeline Stage</label>
          <select value={deal.stage} onChange={(e) => onStageChange(deal.id, e.target.value)}>
            {PROPERTY_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <div className="field-grid-2" style={{ marginTop: 18 }}>
            <Field label="Society" value={`${deal.society} · ${deal.unit}`} />
            <Field label="City" value={deal.city} />
            <Field label="Phone" value={deal.sellerPhone1} />
            <Field label="Acquisition Cost" value={formatCurrency(deal.acquisitionCost)} />
            <Field label="POC" value={deal.poc} />
            <Field label="Source" value={deal.source} />
            <Field label="Token Date" value={formatPropDate(deal.tokenDate)} />
            <Field label="Registry" value={deal.registry} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PropertyKanban({ properties, onStageChange, selected, onSelect, onClose }) {
  return (
    <>
      <div className="kanban">
        {PROPERTY_STAGES.map((stage) => (
          <KanbanColumn key={stage.key} stage={stage} items={properties.filter((p) => p.stage === stage.key)} onCardClick={onSelect} />
        ))}
      </div>
      <DealDrawer deal={selected} onClose={onClose} onStageChange={onStageChange} />
    </>
  );
}

export { STAGE_MAP };
