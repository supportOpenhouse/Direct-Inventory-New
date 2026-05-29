import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { IconClose } from './icons.jsx';

/**
 * Visit-schedule flow (ported). Date + time + field exec (+ assigned-by for
 * admin). Before sending, checks for existing OpenHouse units in the society
 * and asks for confirmation. Talks to /api/visits/*.
 */
export default function VisitScheduleModal({ item, onClose, onScheduled }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [execs, setExecs] = useState([]);
  const [execPhone, setExecPhone] = useState('');
  const [loadingExecs, setLoadingExecs] = useState(true);
  const [assignees, setAssignees] = useState([]);
  const [assignedBy, setAssignedBy] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [pendingUnits, setPendingUnits] = useState(null);

  useEffect(() => {
    let alive = true;
    api.get('/api/visits/field-execs')
      .then((r) => { if (alive) setExecs(r.items || []); })
      .catch((e) => { if (alive) setError(`Couldn't load field execs: ${e.data?.error || e.message}`); })
      .finally(() => { if (alive) setLoadingExecs(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let alive = true;
    api.get('/api/visits/assignees').then((r) => { if (alive) setAssignees(r.items || []); }).catch(() => {});
    return () => { alive = false; };
  }, [isAdmin]);

  async function sendSchedule() {
    try {
      setSubmitting(true);
      const r = await api.post('/api/visits/schedule', {
        oh_id: item.oh_id, schedule_date: date, schedule_time: time, field_exec_phone: execPhone,
        ...(isAdmin ? { assigned_by_email: assignedBy } : {}),
      });
      onScheduled(r);
    } catch (e) {
      if (e.status === 409 && e.data?.existing_visit) { alert(`Visit already scheduled for ${item.oh_id}.`); onClose(); return; }
      setError(e.data?.error || e.message || 'Could not schedule the visit');
    } finally { setSubmitting(false); }
  }

  async function submit() {
    setError(null);
    if (!date || !time || !execPhone) { setError('Date, Time and Field Exec are required'); return; }
    if (isAdmin && !assignedBy) { setError('Pick who this visit is assigned by'); return; }
    const society = (item.society || '').trim();
    if (!society) { await sendSchedule(); return; }
    try {
      setSubmitting(true);
      const r = await api.get(`/api/visits/society-units?society=${encodeURIComponent(society)}`);
      const units = r.items || [];
      if (units.length === 0) { await sendSchedule(); return; }
      setPendingUnits(units);
    } catch (e) {
      setError(`Couldn't check existing units: ${e.data?.error || e.message}`);
    } finally { setSubmitting(false); }
  }

  if (pendingUnits && pendingUnits.length > 0) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-head-row"><h3>Existing OpenHouse units</h3><button className="modal-close" onClick={onClose}><IconClose /></button></div>
          <p className="modal-sub">These units are already with OpenHouse in <strong>{item.society}</strong>. Continue?</p>
          <div className="inv-table-wrap" style={{ maxHeight: 240 }}>
            <table className="inv-table">
              <thead><tr><th className="inv-th">UID</th><th className="inv-th">Tower</th><th className="inv-th">Unit</th><th className="inv-th">Config</th></tr></thead>
              <tbody>{pendingUnits.map((u) => <tr key={u.uid} className="inv-row"><td>{u.uid}</td><td>{u.tower_no || '—'}</td><td>{u.unit_no || '—'}</td><td>{u.configuration || '—'}</td></tr>)}</tbody>
            </table>
          </div>
          {error && <div className="modal-error">{error}</div>}
          <div className="modal-actions"><button className="btn-ghost" onClick={() => setPendingUnits(null)} disabled={submitting}>Back</button><span style={{ flex: 1 }} /><button className="btn-primary" onClick={sendSchedule} disabled={submitting}>{submitting ? 'Scheduling…' : 'Confirm & Schedule'}</button></div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head-row"><h3>Schedule Visit</h3><button className="modal-close" onClick={onClose}><IconClose /></button></div>
        <p className="modal-sub">{item.oh_id} · {item.society || '—'}</p>

        <label>Date <span className="req">*</span></label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <label style={{ marginTop: 10 }}>Time <span className="req">*</span></label>
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <label style={{ marginTop: 10 }}>Field Exec <span className="req">*</span></label>
        <select value={execPhone} onChange={(e) => setExecPhone(e.target.value)} disabled={loadingExecs}>
          <option value="">{loadingExecs ? 'Loading…' : 'Select…'}</option>
          {execs.map((u) => <option key={u.id} value={u.phone}>{u.name} {u.phone ? `(${u.phone})` : ''}</option>)}
        </select>
        {isAdmin ? (
          <>
            <label style={{ marginTop: 10 }}>Assigned By <span className="req">*</span></label>
            <select value={assignedBy} onChange={(e) => setAssignedBy(e.target.value)}>
              <option value="">Select manager / RM…</option>
              {assignees.map((u) => <option key={u.id} value={u.email}>{u.name || u.email}</option>)}
            </select>
          </>
        ) : (
          <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>Assigned by: <strong>{user?.name || user?.email || '—'}</strong></div>
        )}

        {error && <div className="modal-error">{error}</div>}
        <div className="modal-actions"><span style={{ flex: 1 }} /><button className="btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button><button className="btn-primary" onClick={submit} disabled={submitting}>{submitting ? 'Checking…' : 'Schedule'}</button></div>
      </div>
    </div>
  );
}
