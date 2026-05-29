import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import ExpandPanel from '../components/ExpandPanel.jsx';
import {
  CITIES, displayCity, formatPrice, isCreatedToday, REJECT_REASONS, starColor, variation,
} from '../utils/format.js';
import { IconExternal, IconSearch } from '../components/icons.jsx';

const EXPAND_SECTIONS = ['property', 'seller', 'notes'];

// ── star cell (priority toggle) ──────────────────────────────────────────
function StarCell({ item, canSet, onUpdated }) {
  const color = starColor(item);
  if (!color && !canSet) return <td className="inv-td-star" />;
  async function toggle(e) {
    e.stopPropagation();
    if (!canSet) return;
    const wantYellow = color !== 'yellow';
    const body = wantYellow ? { star_color: 'yellow', priority: true } : { star_color: null, priority: false };
    onUpdated({ ...item, ...body });
    try { const r = await api.patch(`/api/inventory/${item.oh_id}`, body); if (r?.item) onUpdated(r.item); }
    catch { onUpdated(item); }
  }
  return (
    <td className="inv-td-star">
      <button type="button" disabled={!canSet}
        className={`prio-star ${color === 'yellow' ? 'prio-on' : color === 'green' ? 'cp-perfect' : color === 'red' ? 'cp-partial' : 'prio-off'}`}
        onClick={toggle} title="Priority">★</button>
    </td>
  );
}

// ── left: unacted leads ──────────────────────────────────────────────────
function UnactedTable({ items, loading, role, onUpdated, onQualify, onReject }) {
  const [openId, setOpenId] = useState(null);
  const [rejectFor, setRejectFor] = useState(null);
  const canSet = ['admin', 'manager', 'rm'].includes(role);
  const cols = 4;
  const link = (it) => (it.listing_link && !/^internal:\/\//.test(it.listing_link) ? it.listing_link : null);

  return (
    <div className="inv-table-wrap">
      <table className="inv-table">
        <thead>
          <tr>
            <th className="inv-th inv-th-star" />
            <th className="inv-th">Society</th>
            <th className="inv-th">Link</th>
            <th className="inv-th">Action</th>
          </tr>
        </thead>
        <tbody>
          {loading && Array.from({ length: 6 }).map((_, r) => (
            <tr className="inv-row" key={`s${r}`}>{Array.from({ length: cols }).map((__, c) => <td key={c}><span className="inv-skel" /></td>)}</tr>
          ))}
          {!loading && items.length === 0 && <tr><td className="inv-empty" colSpan={cols}>No unacted leads.</td></tr>}
          {!loading && items.map((it) => {
            const isOpen = openId === it.oh_id;
            return (
              <Fragment key={it.oh_id}>
                <tr className={`inv-row ${isOpen ? 'inv-row-open' : ''}`} onClick={() => setOpenId(isOpen ? null : it.oh_id)}>
                  <StarCell item={it} canSet={canSet} onUpdated={onUpdated} />
                  <td className="inv-td-society">
                    {it.society || '—'}
                    {isCreatedToday(it.created_at) && <span className="new-badge" style={{ marginLeft: 8 }}>NEW</span>}
                    <div className="inv-td-muted" style={{ fontWeight: 400, fontSize: 12 }}>{displayCity(it.city)} · {it.oh_id}</div>
                  </td>
                  <td>
                    {link(it)
                      ? <a className="inv-link" href={link(it)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Listing <IconExternal size={12} /></a>
                      : <span className="muted">—</span>}
                  </td>
                  <td style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                    <div className="lead-actions">
                      <button className="lead-act-q" onClick={() => onQualify(it)}>Qualified</button>
                      <button className="lead-act-r" onClick={() => setRejectFor(rejectFor === it.oh_id ? null : it.oh_id)}>Reject ▾</button>
                    </div>
                    {rejectFor === it.oh_id && (
                      <div className="reject-menu" onMouseLeave={() => setRejectFor(null)}>
                        <div className="rm-title">Reject reason</div>
                        {REJECT_REASONS.map((r) => (
                          <button key={r.value} onClick={() => { setRejectFor(null); onReject(it, r.value); }}>{r.label}</button>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
                {isOpen && (
                  <tr className="expand-row"><td colSpan={cols}>
                    <ExpandPanel item={it} role={role} onUpdated={onUpdated} canPost={canSet} sections={EXPAND_SECTIONS} />
                  </td></tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── right: qualified leads ────────────────────────────────────────────────
function QualifiedTable({ items, loading, role, onUpdated }) {
  const [openId, setOpenId] = useState(null);
  const canPost = ['admin', 'manager', 'rm'].includes(role);
  const cols = 7;
  return (
    <div className="inv-table-wrap">
      <table className="inv-table">
        <thead>
          <tr>
            <th className="inv-th">Society</th>
            <th className="inv-th">BHK</th>
            <th className="inv-th">Floor</th>
            <th className="inv-th">Area</th>
            <th className="inv-th inv-th-right">Asking</th>
            <th className="inv-th inv-th-right">OH Price</th>
            <th className="inv-th inv-th-right">Variation</th>
          </tr>
        </thead>
        <tbody>
          {loading && Array.from({ length: 6 }).map((_, r) => (
            <tr className="inv-row" key={`s${r}`}>{Array.from({ length: cols }).map((__, c) => <td key={c}><span className="inv-skel" /></td>)}</tr>
          ))}
          {!loading && items.length === 0 && <tr><td className="inv-empty" colSpan={cols}>No qualified leads yet.</td></tr>}
          {!loading && items.map((it) => {
            const isOpen = openId === it.oh_id;
            const v = variation(it.price, it.oh_price);
            return (
              <Fragment key={it.oh_id}>
                <tr className={`inv-row ${isOpen ? 'inv-row-open' : ''}`} onClick={() => setOpenId(isOpen ? null : it.oh_id)}>
                  <td className="inv-td-society">{it.society || '—'}<div className="inv-td-muted" style={{ fontWeight: 400, fontSize: 12 }}>{displayCity(it.city)} · {it.oh_id}</div></td>
                  <td>{it.bedrooms != null ? `${it.bedrooms} BHK` : '—'}</td>
                  <td>{it.floor || '—'}</td>
                  <td>{it.area_sqft != null ? `${it.area_sqft} sqft` : '—'}</td>
                  <td className="inv-td-num val-orange">{formatPrice(it.price)}</td>
                  <td className={`inv-td-num ${it.oh_price ? 'val-green' : 'muted'}`}>{it.oh_price ? formatPrice(it.oh_price) : '—'}</td>
                  <td className={`inv-td-num ${v ? `val-var-${v.sign}` : 'muted'}`}>{v ? v.label : '—'}</td>
                </tr>
                {isOpen && (
                  <tr className="expand-row"><td colSpan={cols}>
                    <ExpandPanel item={it} role={role} onUpdated={onUpdated} canPost={canPost} sections={EXPAND_SECTIONS} />
                  </td></tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Leads() {
  const { user } = useAuth();
  const [qInput, setQInput] = useState('');
  const [qApplied, setQApplied] = useState('');
  const [city, setCity] = useState('');
  const [unacted, setUnacted] = useState([]);
  const [qualified, setQualified] = useState([]);
  const [loadingL, setLoadingL] = useState(true);
  const [loadingR, setLoadingR] = useState(true);

  // resizable split (left pane width %, clamped 25–75)
  const [leftPct, setLeftPct] = useState(50);
  const containerRef = useRef(null);
  const draggingRef = useRef(false);

  function baseParams(stage) {
    const p = new URLSearchParams();
    p.set('stage', stage);
    if (qApplied) p.set('q', qApplied);
    if (city) p.set('city', city);
    p.set('limit', '500');
    return p;
  }

  const loadUnacted = useCallback(async () => {
    setLoadingL(true);
    try { const r = await api.get(`/api/inventory?${baseParams('lead')}`); setUnacted(r.items || []); }
    finally { setLoadingL(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qApplied, city]);

  const loadQualified = useCallback(async () => {
    setLoadingR(true);
    try { const r = await api.get(`/api/inventory?${baseParams('qualified')}`); setQualified(r.items || []); }
    finally { setLoadingR(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qApplied, city]);

  useEffect(() => { loadUnacted(); loadQualified(); }, [loadUnacted, loadQualified]);

  // divider drag
  const onDrag = useCallback((e) => {
    if (!draggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    setLeftPct(Math.min(75, Math.max(25, pct)));
  }, []);
  useEffect(() => {
    function up() { draggingRef.current = false; document.body.style.cursor = ''; }
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', onDrag); window.removeEventListener('mouseup', up); };
  }, [onDrag]);

  function patch(setter) {
    return (updated) => setter((prev) => prev.map((it) => (it.oh_id === updated.oh_id ? { ...it, ...updated } : it)));
  }

  async function qualify(item) {
    setUnacted((prev) => prev.filter((it) => it.oh_id !== item.oh_id));
    const moved = { ...item, stage: 'qualified' };
    setQualified((prev) => [moved, ...prev]);
    try { await api.patch(`/api/inventory/${item.oh_id}`, { stage: 'qualified' }); }
    catch { loadUnacted(); loadQualified(); }
  }

  async function reject(item, reason) {
    setUnacted((prev) => prev.filter((it) => it.oh_id !== item.oh_id));
    try { await api.patch(`/api/inventory/${item.oh_id}`, { stage: 'rejected', reject_reason: reason }); }
    catch { loadUnacted(); }
  }

  function onSearch(e) { e.preventDefault(); setQApplied(qInput.trim()); }

  return (
    <div className="leads-page">
      <div className="leads-toolbar">
        <div className="city-tabs">
          <button className={!city ? 'tab tab-active' : 'tab'} onClick={() => setCity('')}>All</button>
          {CITIES.map((c) => <button key={c} className={city === c ? 'tab tab-active' : 'tab'} onClick={() => setCity(c)}>{c}</button>)}
        </div>
        <form className="search-form" onSubmit={onSearch}>
          <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search society, OH-ID, seller…" />
          <button type="submit" className="btn-primary"><IconSearch size={16} /> Search</button>
          {qApplied && <button type="button" className="btn-ghost" onClick={() => { setQInput(''); setQApplied(''); }}>Clear</button>}
        </form>
      </div>

      <div className="leads-split" ref={containerRef}>
        <div className="leads-pane" style={{ width: `calc(${leftPct}% - 7px)` }}>
          <div className="leads-pane-head">
            <h3>Unacted Leads</h3>
            <span className="lph-count accent">{unacted.length}</span>
            <span className="muted" style={{ fontSize: 12 }}>status: lead</span>
          </div>
          <UnactedTable items={unacted} loading={loadingL} role={user?.role} onUpdated={patch(setUnacted)} onQualify={qualify} onReject={reject} />
        </div>

        <div className={`split-divider ${draggingRef.current ? 'dragging' : ''}`}
          onMouseDown={() => { draggingRef.current = true; document.body.style.cursor = 'col-resize'; }}
          role="separator" aria-label="Resize panes">
          <span className="sd-grip" />
        </div>

        <div className="leads-pane" style={{ width: `calc(${100 - leftPct}% - 7px)` }}>
          <div className="leads-pane-head">
            <h3>Qualified Leads</h3>
            <span className="lph-count">{qualified.length}</span>
            <span className="muted" style={{ fontSize: 12 }}>status: qualified</span>
          </div>
          <QualifiedTable items={qualified} loading={loadingR} role={user?.role} onUpdated={patch(setQualified)} />
        </div>
      </div>
    </div>
  );
}
