import { useState } from 'react';
import NoteThread from './NoteThread.jsx';
import StatusEditModal from './StatusEditModal.jsx';
import { formatDateShort, formatPrice, STAGE_DOT_COLOR, stageLabel, variation } from '../utils/format.js';

function Field({ label, children }) {
  return (
    <div className="field-row">
      <span className="field-lbl">{label}</span>
      <span className="field-val">{children ?? '—'}</span>
    </div>
  );
}

/**
 * Inline drill-down panel revealed beneath a clicked table row.
 * Distributed columns: Property Details · Pricing · Seller Details · Notes.
 * `sections` lets a host trim what's shown (Leads keeps it lean).
 */
export default function ExpandPanel({ item, role, onUpdated, canPost = true, sections }) {
  const show = sections || ['property', 'pricing', 'seller', 'notes'];
  const v = variation(item.price, item.oh_price);
  const listing = item.listing_link && !/^internal:\/\//.test(item.listing_link) ? item.listing_link : null;
  const canEdit = ['admin', 'manager', 'rm'].includes(role) || canPost;
  const [showStatus, setShowStatus] = useState(false);

  return (
    <div className="expand-inner">
      {show.includes('property') && (
        <div className="expand-sec">
          <h4>🏠 Property Details</h4>
          <div className="field-grid-2">
            <Field label="Area">{item.area_sqft != null ? `${item.area_sqft} sqft` : '—'}</Field>
            <Field label="BHK">{item.bedrooms != null ? `${item.bedrooms} BHK` : '—'}</Field>
            <Field label="Tower">{item.tower || '—'}</Field>
            <Field label="Unit no.">{item.unit_no || '—'}</Field>
            <Field label="Floor">{item.floor || '—'}</Field>
            <Field label="Locality">{item.locality || '—'}</Field>
          </div>
        </div>
      )}

      {show.includes('pricing') && (
        <div className="expand-sec">
          <h4>💰 Pricing &amp; Source</h4>
          <div className="field-grid-2">
            <Field label="Asking"><span className="val-orange">{formatPrice(item.price)}</span></Field>
            <Field label="OH Price">
              {item.oh_price ? <span className="val-green">{formatPrice(item.oh_price)}</span> : <span className="muted">no match</span>}
            </Field>
            <Field label="Variation">
              {v ? <span className={`val-var-${v.sign}`}>{v.label}</span> : '—'}
            </Field>
            <Field label="Source">{item.source || '—'}</Field>
            <Field label="Posted">{formatDateShort(item.posting_date)}</Field>
            <Field label="Listing">
              {listing ? <a className="inv-link" href={listing} target="_blank" rel="noreferrer">Open ↗</a> : <span className="muted">—</span>}
            </Field>
          </div>
        </div>
      )}

      {show.includes('seller') && (
        <div className="expand-sec">
          <h4>👤 Seller Details</h4>
          <Field label="Seller name">{item.seller_name || '—'}</Field>
          <Field label="Phone no.">
            {item.seller_phone
              ? <a className="inv-link" href={`tel:${item.seller_phone}`}>{item.seller_phone}</a>
              : '—'}
          </Field>
        </div>
      )}

      {show.includes('notes') && (
        <div className="expand-sec">
          <div className="expand-status-row">
            <span className="expand-status-cur">
              <span className="stage-dot" style={{ background: STAGE_DOT_COLOR[item.stage] }} />
              {stageLabel(item.stage)}
            </span>
            {canEdit && (
              <button type="button" className="btn-soft btn-edit-status" onClick={() => setShowStatus(true)}>✎ Edit Status</button>
            )}
          </div>
          <NoteThread
            ohId={item.oh_id}
            initial={item.note_thread || []}
            canPost={canPost}
            onChange={(next) => onUpdated?.({ ...item, note_thread: next })}
          />
        </div>
      )}

      {showStatus && (
        <StatusEditModal item={item} onUpdated={(u) => onUpdated?.(u)} onClose={() => setShowStatus(false)} />
      )}
    </div>
  );
}
