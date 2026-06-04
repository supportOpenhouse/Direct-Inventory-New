import { lazy, Suspense, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { foldCities } from '../utils/format.js';

// Lazy — MapLibre is heavy and only needed when a coverage map is shown.
const ScopeMap = lazy(() => import('../components/ScopeMap.jsx'));

function initials(name, email) {
  const s = (name || (email || '').split('@')[0] || '').trim();
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase() || '?';
}

const SCOPE_LIMIT = 5;

function ScopeList({ label, items }) {
  const [expanded, setExpanded] = useState(false);
  const list = items || [];
  const overflow = list.length - SCOPE_LIMIT;
  const shown = expanded ? list : list.slice(0, SCOPE_LIMIT);
  return (
    <div className="pf-scope">
      <label>{label}</label>
      {list.length === 0 ? (
        <div className="muted">—</div>
      ) : (
        <ul className="pf-scope-list">
          {shown.map((x) => <li key={x}>{x}</li>)}
          {!expanded && overflow > 0 && (
            <li><button type="button" className="pf-more" onClick={() => setExpanded(true)} title={`Show ${overflow} more`}>… ({overflow} more)</button></li>
          )}
          {expanded && overflow > 0 && (
            <li><button type="button" className="pf-more" onClick={() => setExpanded(false)}>show less</button></li>
          )}
        </ul>
      )}
    </div>
  );
}

export default function MyProfile() {
  const { user } = useAuth();
  const isAdminViewer = user?.role === 'admin';

  const [me, setMe] = useState(null);          // own profile — always the LEFT side
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Admin "view as" — only feeds the coverage MAP, never the left side.
  const [people, setPeople] = useState([]);
  const [viewId, setViewId] = useState('');
  const [mapProfile, setMapProfile] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    api.get('/api/users/profile')
      .then((r) => { if (alive) setMe(r); })
      .catch((e) => { if (alive) setError(e.data?.error || e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!isAdminViewer) return;
    api.get('/api/users').then((r) => setPeople((r.items || []).filter((u) => u.role !== 'admin'))).catch(() => setPeople([]));
  }, [isAdminViewer]);

  useEffect(() => {
    if (!isAdminViewer || !viewId) { setMapProfile(null); return undefined; }
    let alive = true;
    api.get(`/api/users/profile?user_id=${viewId}`)
      .then((r) => { if (alive) setMapProfile(r); })
      .catch(() => { if (alive) setMapProfile(null); });
    return () => { alive = false; };
  }, [isAdminViewer, viewId]);

  if (loading) return <div className="al-empty">Loading…</div>;
  if (error) return <div className="modal-error">{error}</div>;
  if (!me) return null;

  const p = me;                       // left side = own profile (unchanged by "view as")
  const { role } = p;
  const cityList = foldCities(p.cities);
  const showTeam = role === 'admin' || role === 'manager';
  const showScope = role === 'manager' || role === 'rm';

  // Map target: admin → the selected user (if any); everyone else → themselves.
  const mapTarget = isAdminViewer ? mapProfile : me;
  const showMap = !!mapTarget && (mapTarget.role === 'manager' || mapTarget.role === 'rm');

  const detailsCard = (
    <div className="card-block">
      <div className="pf-head">
        <span className="pf-avatar">{initials(p.name, p.email)}</span>
        <div>
          <div className="pf-name">{p.name || '—'} <span className="role-chip">{role}</span></div>
          <div className="muted">{p.email}</div>
        </div>
      </div>

      <div className="pf-grid">
        <div className="pf-field"><label>Name</label><div>{p.name || '—'}</div></div>
        <div className="pf-field"><label>Email</label><div>{p.email}</div></div>
        <div className="pf-field"><label>Phone</label><div>{p.phone || '—'}</div></div>
        <div className="pf-field"><label>Role</label><div style={{ textTransform: 'capitalize' }}>{role}</div></div>
        {(role === 'manager' || role === 'rm') && (
          <div className="pf-field"><label>My Manager</label>
            <div>{p.manager ? (p.manager.name || p.manager.email) : <span className="muted">—</span>}</div>
          </div>
        )}
      </div>

      {showScope && (
        <div className="pf-scope-row">
          {(role === 'manager' || role === 'rm') && <ScopeList label="My City" items={cityList} />}
          {role === 'rm' && <ScopeList label="My Micro-market" items={p.micro_market} />}
          {role === 'rm' && <ScopeList label="My Society" items={p.society} />}
        </div>
      )}
    </div>
  );

  const teamCard = showTeam && (
    <div className="card-block">
      <h3>My Team <span className="muted">{p.team?.length || 0}</span></h3>
      {(!p.team || p.team.length === 0)
        ? <p className="muted">No one reports to you yet.</p>
        : (
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
            <tbody>
              {p.team.map((m) => (
                <tr key={m.id}>
                  <td>{m.name || '—'}</td>
                  <td>{m.email}</td>
                  <td style={{ textTransform: 'capitalize' }}>{m.role}</td>
                  <td>{m.is_active ? 'Active' : <span className="muted">Inactive</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </div>
  );

  const adminBar = isAdminViewer && (
    <div className="card-block pov-bar">
      <label>Map — view as</label>
      <select value={viewId} onChange={(e) => setViewId(e.target.value)} className="role-select">
        <option value="">— select a user —</option>
        {people.map((u) => <option key={u.id} value={u.id}>{u.name || u.email} · {u.role}</option>)}
      </select>
    </div>
  );

  const mapCard = showMap ? (
    <div className="card-block scope-card">
      <h3>Coverage map
        {isAdminViewer && mapTarget && <span className="muted"> — {mapTarget.name || mapTarget.email}</span>}
        <span className="muted"> · approximate</span>
      </h3>
      <Suspense fallback={<div className="scope-map-skeleton">Loading map…</div>}>
        <ScopeMap cities={foldCities(mapTarget.cities)} society={mapTarget.society || []} />
      </Suspense>
    </div>
  ) : isAdminViewer && (
    // Admin with no user selected — keep the map's place with a skeletal box.
    <div className="card-block scope-card">
      <h3>Coverage map</h3>
      <div className="scope-map-skeleton">
        {viewId ? 'Loading…' : 'Select a user above to view their coverage map.'}
      </div>
    </div>
  );

  return (
    <div className="profile-page">
      <div className="profile-grid2">
        <div className="profile-col">{detailsCard}{teamCard}</div>
        <div className="profile-col">{adminBar}{mapCard}</div>
      </div>
    </div>
  );
}
