import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';
import { CITIES } from '../utils/format.js';
import SearchableMultiSelect from './SearchableMultiSelect.jsx';
import { IconClose } from './icons.jsx';

function isoLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function presetRange(name) {
  const now = new Date();
  if (name === 'today') { const s = isoLocal(now); return { from: s, to: s }; }
  if (name === 'yesterday') { const y = new Date(now); y.setDate(now.getDate() - 1); const s = isoLocal(y); return { from: s, to: s }; }
  if (name === 'this_week') { const dow = (now.getDay() + 6) % 7; const mon = new Date(now); mon.setDate(now.getDate() - dow); return { from: isoLocal(mon), to: isoLocal(now) }; }
  if (name === 'this_month') { const first = new Date(now.getFullYear(), now.getMonth(), 1); return { from: isoLocal(first), to: isoLocal(now) }; }
  return { from: '', to: '' };
}

const EMPTY = {
  society: [], locality: [], bhk: [],
  price_min: '', price_max: '', variation_min: '', variation_max: '',
  source: '', date_preset: '', posting_from: '', posting_to: '',
};

export default function FilterPanel({ initial, defaultCity = '', onApply, onClose }) {
  const [f, setF] = useState(() => ({
    ...EMPTY, ...initial,
    society: Array.isArray(initial?.society) ? initial.society : [],
    locality: Array.isArray(initial?.locality) ? initial.locality : [],
    bhk: Array.isArray(initial?.bhk) ? initial.bhk : [],
  }));
  const [societies, setSocieties] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const cities = defaultCity ? [defaultCity] : CITIES;
    Promise.all(cities.map((c) => api.get(`/api/inventory/societies?city=${encodeURIComponent(c)}`)))
      .then((res) => { if (alive) setSocieties(res.flatMap((r) => r.items || [])); })
      .catch(() => { if (alive) setSocieties([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [defaultCity]);

  const societyOptions = useMemo(() => [...new Set(societies.map((s) => s.society).filter(Boolean))].sort(), [societies]);
  const localityOptions = useMemo(() => [...new Set(societies.map((s) => (s.locality || '').trim()).filter(Boolean))].sort(), [societies]);

  function set(k, v) { setF((p) => ({ ...p, [k]: v })); }
  function toggleBhk(n) { setF((p) => ({ ...p, bhk: p.bhk.includes(n) ? p.bhk.filter((x) => x !== n) : [...p.bhk, n] })); }
  function applyPreset(name) {
    setF((p) => {
      if (p.date_preset === name) return { ...p, date_preset: '', posting_from: '', posting_to: '' };
      const { from, to } = presetRange(name);
      return { ...p, date_preset: name, posting_from: from, posting_to: to };
    });
  }
  function reset() { setF(EMPTY); }

  function apply() {
    const out = {};
    if (f.society.length) out.society = f.society.join(',');
    if (f.locality.length) out.locality = f.locality.join(',');
    if (f.bhk.length) out.bhk = f.bhk.join(',');
    if (f.price_min !== '') out.price_min = Number(f.price_min);
    if (f.price_max !== '') out.price_max = Number(f.price_max);
    if (f.variation_min !== '') out.variation_min = Number(f.variation_min);
    if (f.variation_max !== '') out.variation_max = Number(f.variation_max);
    if (f.source) out.source = f.source;
    if (f.posting_from) out.posting_from = f.posting_from;
    if (f.posting_to) out.posting_to = f.posting_to;
    onApply(out, f);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal filter-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head-row">
          <h3>Filters</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>

        <div className="filter-grid">
          <div className="filter-block">
            <label>Society</label>
            <SearchableMultiSelect options={societyOptions} value={f.society} onChange={(v) => set('society', v)}
              placeholder={loading ? 'Loading…' : 'Pick societies…'} />
          </div>
          <div className="filter-block">
            <label>Locality</label>
            <SearchableMultiSelect options={localityOptions} value={f.locality} onChange={(v) => set('locality', v)}
              placeholder={loading ? 'Loading…' : 'Pick localities…'} />
          </div>

          <div className="filter-block">
            <label>BHK</label>
            <div className="bhk-pills">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" className={f.bhk.includes(n) ? 'pill pill-on' : 'pill'} onClick={() => toggleBhk(n)}>{n} BHK</button>
              ))}
            </div>
          </div>
          <div className="filter-block">
            <label>Source</label>
            <input value={f.source} onChange={(e) => set('source', e.target.value)} placeholder="e.g. 99acres, Website" />
          </div>

          <div className="filter-block">
            <label>Asking price (₹)</label>
            <div className="range-row">
              <input type="number" placeholder="min" value={f.price_min} onChange={(e) => set('price_min', e.target.value)} />
              <span className="muted">to</span>
              <input type="number" placeholder="max" value={f.price_max} onChange={(e) => set('price_max', e.target.value)} />
            </div>
          </div>
          <div className="filter-block">
            <label>Variation (%)</label>
            <div className="range-row">
              <input type="number" placeholder="min %" step="0.1" value={f.variation_min} onChange={(e) => set('variation_min', e.target.value)} />
              <span className="muted">to</span>
              <input type="number" placeholder="max %" step="0.1" value={f.variation_max} onChange={(e) => set('variation_max', e.target.value)} />
            </div>
          </div>

          <div className="filter-block" style={{ gridColumn: '1 / -1' }}>
            <label>Date posted</label>
            <div className="preset-grid-3">
              {[['today', 'Today'], ['yesterday', 'Yesterday'], ['this_week', 'This Week'], ['this_month', 'This Month'], ['custom', 'Custom']].map(([k, lbl]) => (
                <button key={k} type="button" className={f.date_preset === k ? 'pill pill-on' : 'pill'}
                  onClick={() => (k === 'custom' ? set('date_preset', f.date_preset === 'custom' ? '' : 'custom') : applyPreset(k))}>{lbl}</button>
              ))}
            </div>
            {f.date_preset === 'custom' && (
              <div className="range-row" style={{ marginTop: 8 }}>
                <input type="date" value={f.posting_from} onChange={(e) => set('posting_from', e.target.value)} />
                <span className="muted">to</span>
                <input type="date" value={f.posting_to} onChange={(e) => set('posting_to', e.target.value)} />
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={reset}>Reset</button>
          <span style={{ flex: 1 }} />
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={apply}>Apply</button>
        </div>
      </div>
    </div>
  );
}
