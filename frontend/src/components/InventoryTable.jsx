import { Fragment, useState } from 'react';
import { api } from '../api/client.js';
import ExpandPanel from './ExpandPanel.jsx';
import {
  displayCity, formatDateRel, formatDateShort, formatPrice, rowFlag, starColor,
  STAGE_DOT_COLOR, stageLabel, variation,
} from '../utils/format.js';

const SORTABLE = new Set([
  'oh_id', 'city', 'society', 'bedrooms', 'floor', 'area_sqft',
  'price', 'oh_price', 'variation', 'stage', 'seller_name', 'seller_phone',
  'posting_date', 'created_at', 'follow_up_at',
]);

function latestNote(thread) {
  if (!Array.isArray(thread) || thread.length === 0) return null;
  return thread.reduce((best, n) => (!best || new Date(n.created_at) > new Date(best.created_at) ? n : best), null);
}

function SortTh({ field, label, sort, onSort, align = 'left' }) {
  const active = sort?.field === field;
  const arrow = active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕';
  function click() {
    if (!SORTABLE.has(field)) return;
    onSort({ field, dir: active ? (sort.dir === 'asc' ? 'desc' : 'asc') : 'desc' });
  }
  return (
    <th
      className={`inv-th ${align === 'right' ? 'inv-th-right' : ''} ${SORTABLE.has(field) ? 'inv-th-sortable' : ''} ${active ? 'inv-th-active' : ''}`}
      onClick={click}
    >
      {label} <span className={active ? 'inv-th-arrow-active' : 'inv-th-arrow'}>{arrow}</span>
    </th>
  );
}

const SKELETON_ROWS = 8;

export default function InventoryTable({ items, role, sort, onSort, onUpdated, loading = false }) {
  const [openId, setOpenId] = useState(null);
  const canSetPriority = ['admin', 'manager', 'rm'].includes(role);
  const colCount = 17;

  async function togglePriority(e, item) {
    e.stopPropagation();
    if (!canSetPriority) return;
    const wantYellow = starColor(item) !== 'yellow';
    const body = wantYellow ? { star_color: 'yellow', priority: true } : { star_color: null, priority: false };
    onUpdated({ ...item, ...body });
    try {
      const r = await api.patch(`/api/inventory/${item.oh_id}`, body);
      if (r?.item) onUpdated(r.item);
    } catch { onUpdated(item); }
  }

  return (
    <div className="inv-table-wrap">
      <table className="inv-table">
        <thead>
          <tr>
            <th className="inv-th inv-th-star" />
            <SortTh field="oh_id" label="OH-ID" sort={sort} onSort={onSort} />
            <SortTh field="city" label="City" sort={sort} onSort={onSort} />
            <SortTh field="society" label="Society" sort={sort} onSort={onSort} />
            <SortTh field="bedrooms" label="BHK" sort={sort} onSort={onSort} />
            <SortTh field="floor" label="Floor" sort={sort} onSort={onSort} />
            <SortTh field="area_sqft" label="Area" sort={sort} onSort={onSort} />
            <SortTh field="price" label="Asking" sort={sort} onSort={onSort} align="right" />
            <SortTh field="oh_price" label="OH Price" sort={sort} onSort={onSort} align="right" />
            <SortTh field="variation" label="Variation" sort={sort} onSort={onSort} align="right" />
            <SortTh field="stage" label="Stage" sort={sort} onSort={onSort} />
            <SortTh field="follow_up_at" label="Follow-up" sort={sort} onSort={onSort} />
            <SortTh field="seller_name" label="Seller" sort={sort} onSort={onSort} />
            <SortTh field="seller_phone" label="Phone" sort={sort} onSort={onSort} />
            <SortTh field="posting_date" label="Posted" sort={sort} onSort={onSort} />
            <SortTh field="created_at" label="Created" sort={sort} onSort={onSort} />
            <th className="inv-th">Notes</th>
          </tr>
        </thead>
        <tbody>
          {loading && Array.from({ length: SKELETON_ROWS }).map((_, r) => (
            <tr className="inv-row" key={`s-${r}`}>
              {Array.from({ length: colCount }).map((__, c) => <td key={c}><span className="inv-skel" /></td>)}
            </tr>
          ))}
          {!loading && items.length === 0 && (
            <tr><td className="inv-empty" colSpan={colCount}>No matching rows.</td></tr>
          )}
          {!loading && items.map((item) => {
            const v = variation(item.price, item.oh_price);
            const color = starColor(item);
            const flag = rowFlag(item);
            const isOpen = openId === item.oh_id;
            const note = latestNote(item.note_thread);
            return (
              <Fragment key={item.oh_id}>
                <tr
                  className={`inv-row ${color === 'yellow' ? 'inv-row-priority' : ''} ${isOpen ? 'inv-row-open' : ''}`}
                  onClick={() => setOpenId(isOpen ? null : item.oh_id)}
                >
                  <td className="inv-td-star">
                    {(color || canSetPriority) && (
                      <button
                        type="button"
                        className={`prio-star ${color === 'yellow' ? 'prio-on' : color === 'green' ? 'cp-perfect' : color === 'red' ? 'cp-partial' : 'prio-off'}`}
                        onClick={(e) => togglePriority(e, item)}
                        disabled={!canSetPriority}
                        title="Priority"
                      >★</button>
                    )}
                  </td>
                  <td className={`inv-td-id ${flag ? `inv-td-flag-${flag}` : ''}`}>{item.oh_id}</td>
                  <td className={flag ? `inv-td-flag-${flag}` : ''}><span className="city-chip">{displayCity(item.city)?.toUpperCase()}</span></td>
                  <td className={`inv-td-society ${flag ? `inv-td-flag-${flag}` : ''}`}>{item.society || '—'}</td>
                  <td>{item.bedrooms != null ? `${item.bedrooms} BHK` : '—'}</td>
                  <td>{item.floor || '—'}</td>
                  <td>{item.area_sqft != null ? `${item.area_sqft} sqft` : '—'}</td>
                  <td className="inv-td-num val-orange">{formatPrice(item.price)}</td>
                  <td className={`inv-td-num ${item.oh_price ? 'val-green' : 'muted'}`}>{item.oh_price ? formatPrice(item.oh_price) : '—'}</td>
                  <td className={`inv-td-num ${v ? `val-var-${v.sign}` : 'muted'}`}>{v ? v.label : '—'}</td>
                  <td><span className="stage-dot" style={{ background: STAGE_DOT_COLOR[item.stage] }} />{stageLabel(item.stage)}</td>
                  <td className="inv-td-muted">{formatDateShort(item.follow_up_at)}</td>
                  <td>{item.seller_name || '—'}</td>
                  <td className="inv-td-muted">{item.seller_phone || '—'}</td>
                  <td className="inv-td-muted">{formatDateShort(item.posting_date)}</td>
                  <td className="inv-td-muted">{item.created_at ? formatDateRel(item.created_at) : '—'}</td>
                  <td className="inv-td-notes">
                    {note ? <span className="inv-td-notes-body" title={note.body}>{note.body}</span> : '—'}
                  </td>
                </tr>
                {isOpen && (
                  <tr className="expand-row">
                    <td colSpan={colCount}>
                      <ExpandPanel item={item} role={role} onUpdated={onUpdated} canPost={canSetPriority} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
