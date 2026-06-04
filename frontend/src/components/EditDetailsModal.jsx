import { useState } from 'react';
import { api } from '../api/client.js';
import { IconClose } from './icons.jsx';

// Floors offered in the picker (mirrors AddInventoryModal): Ground, Top, 1–50.
const BASE_FLOORS = ['Ground', 'Top', ...Array.from({ length: 50 }, (_, i) => String(i + 1))];

/**
 * Edit the raw property + seller fields of one inventory row. Reached from the
 * "✎ Edit Details" button in the ExpandPanel's Property Details column. Only the
 * fields the user actually changed are PATCHed (the backend skips no-ops anyway).
 */
export default function EditDetailsModal({ item, onUpdated, onClose }) {
  const [f, setF] = useState({
    area_sqft: item.area_sqft ?? '',
    bedrooms: item.bedrooms ?? '',
    floor: item.floor || '',
    tower: item.tower || '',
    unit_no: item.unit_no || '',
    locality: item.locality || '',
    seller_name: item.seller_name || '',
    seller_phone: item.seller_phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function set(k, v) { setF((p) => ({ ...p, [k]: v })); }

  // Keep the row's existing value selectable even if it falls outside the
  // standard option sets, so a save never silently drops it.
  const bhkOpts = [...new Set([2, 3, 4, ...(item.bedrooms != null ? [Number(item.bedrooms)] : [])])].sort((a, b) => a - b);
  const floorOpts = item.floor && !BASE_FLOORS.includes(item.floor) ? [item.floor, ...BASE_FLOORS] : BASE_FLOORS;

  async function save() {
    setError(null);
    const next = {
      area_sqft: f.area_sqft === '' ? null : Math.round(Number(f.area_sqft)),
      bedrooms: f.bedrooms === '' ? null : Number(f.bedrooms),
      floor: f.floor || null,
      tower: f.tower.trim() || null,
      unit_no: f.unit_no.trim() || null,
      locality: f.locality.trim() || null,
      seller_name: f.seller_name.trim() || null,
      seller_phone: f.seller_phone.trim() || null,
    };
    // Diff against the current row — only send fields that actually changed.
    const body = {};
    for (const [k, v] of Object.entries(next)) {
      if (v !== (item[k] ?? null)) body[k] = v;
    }
    if (Object.keys(body).length === 0) { onClose(); return; }
    try {
      setSaving(true);
      const r = await api.patch(`/api/inventory/${item.oh_id}`, body);
      onUpdated(r.item || { ...item, ...body });
      onClose();
    } catch (e) {
      setError(e.data?.error || e.message);
    } finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head-row">
          <h3>Edit Details</h3>
          <span className="role-chip">{item.oh_id}</span>
          <button className="modal-close" onClick={onClose}><IconClose /></button>
        </div>
        <p className="modal-sub">{item.society || '—'}</p>

        <h4 className="edit-sec-h">🏠 Property Details</h4>
        <div className="form-grid">
          <div><label>Area (sqft)</label><input type="number" value={f.area_sqft} onChange={(e) => set('area_sqft', e.target.value)} /></div>
          <div><label>BHK</label>
            <select value={f.bedrooms} onChange={(e) => set('bedrooms', e.target.value)}>
              <option value="">Select…</option>
              {bhkOpts.map((n) => <option key={n} value={String(n)}>{n} BHK</option>)}
            </select>
          </div>
          <div><label>Floor</label>
            <select value={f.floor} onChange={(e) => set('floor', e.target.value)}>
              <option value="">Select…</option>
              {floorOpts.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div><label>Tower</label><input type="text" value={f.tower} onChange={(e) => set('tower', e.target.value)} placeholder="e.g. T3" /></div>
          <div><label>Unit No.</label><input type="text" value={f.unit_no} onChange={(e) => set('unit_no', e.target.value)} placeholder="e.g. 1502" /></div>
          <div><label>Locality</label><input type="text" value={f.locality} onChange={(e) => set('locality', e.target.value)} /></div>
        </div>

        <h4 className="edit-sec-h">👤 Seller Details</h4>
        <div className="form-grid">
          <div><label>Seller Name</label><input type="text" value={f.seller_name} onChange={(e) => set('seller_name', e.target.value)} /></div>
          <div><label>Phone No.</label><input type="tel" maxLength={10} value={f.seller_phone} onChange={(e) => set('seller_phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit" /></div>
        </div>

        {error && <div className="modal-error">{error}</div>}
        <div className="modal-actions">
          <span style={{ flex: 1 }} />
          <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
