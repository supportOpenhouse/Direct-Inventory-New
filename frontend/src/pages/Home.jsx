import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { rejectReasonLabel, stageLabel, STAGE_DOT_COLOR, SUPPLY_STAGES } from '../utils/format.js';
import InventoryBoard from '../components/InventoryBoard.jsx';
import { IconLeads, IconFollowUp, IconPipeline, IconRejected } from '../components/icons.jsx';

const REJECTED_TOP = 3;

function StatTile({ num, label, accent }) {
  return (
    <div className="stat-tile">
      <div className={`st-num ${accent ? 'accent' : ''}`}>{num}</div>
      <div className="st-lbl">{label}</div>
    </div>
  );
}

function QuadCard({ color, Icon, title, to, children }) {
  return (
    <Link to={to} className="quad-card" style={{ '--qc': color }}>
      <div className="quad-head">
        <span className="qh-ic" style={{ color }}><Icon size={20} /></span>
        <h3>{title}</h3>
        <span className="qh-link">View →</span>
      </div>
      {children}
    </Link>
  );
}

function BoardView() {
  const [s, setS] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.get('/api/home/summary')
      .then((r) => { if (alive) setS(r); })
      .catch(() => { if (alive) setS(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const d = (x) => (loading ? '—' : (x ?? 0));
  const f = s?.follow_ups;

  // Rejected breakdown: top 5 reasons by count, the rest folded into "Others".
  const byReason = s?.rejected?.by_reason || {};
  const rejRows = Object.entries(byReason)
    .map(([value, n]) => ({ value, n, label: value === 'unspecified' ? 'Unspecified' : rejectReasonLabel(value) }))
    .sort((a, b) => b.n - a.n);
  const rejTop = rejRows.slice(0, REJECTED_TOP);
  const rejOthers = rejRows.slice(REJECTED_TOP).reduce((sum, r) => sum + r.n, 0);

  return (
    <div className="home-quad">
      <QuadCard color="#fa541c" Icon={IconLeads} title="Leads" to="/leads">
        <div className="quad-stats">
          <StatTile num={d(s?.leads?.unqualified_new)} label="Unqualified · New" accent />
          <StatTile num={d(s?.leads?.unqualified_old)} label="Unqualified · Old" />
          <StatTile num={d(s?.leads?.qualified_new)} label="Qualified · New" />
          <StatTile num={d(s?.leads?.qualified_old)} label="Qualified · Old" />
        </div>
      </QuadCard>

      <QuadCard color="#f97316" Icon={IconFollowUp} title="Follow Ups" to="/follow-ups">
        <div className="fu-matrix">
          <div className="fu-mrow fu-mhead"><span /><span>Today</span><span className="fu-overdue">Overdue</span><span>Future</span></div>
          <div className="fu-mrow">
            <span className="fu-mlbl"><span className="stage-dot" style={{ background: '#f97316' }} />Follow Up</span>
            <span>{d(f?.follow_up?.today)}</span><span className="fu-overdue">{d(f?.follow_up?.past)}</span><span>{d(f?.follow_up?.future)}</span>
          </div>
          <div className="fu-mrow">
            <span className="fu-mlbl"><span className="stage-dot" style={{ background: '#facc15' }} />Call Not Received</span>
            <span>{d(f?.call_not_received?.today)}</span><span className="fu-overdue">{d(f?.call_not_received?.past)}</span><span>{d(f?.call_not_received?.future)}</span>
          </div>
        </div>
      </QuadCard>

      <QuadCard color="#6366f1" Icon={IconPipeline} title="Supply Closure Tracker" to="/pipeline">
        <div className="quad-stats cols-1">
          <div>
            {SUPPLY_STAGES.map((st) => (
              <div key={st} className="stat-row">
                <span className="sr-lbl"><span className="stage-dot" style={{ background: STAGE_DOT_COLOR[st] }} />{stageLabel(st)}</span>
                <span className="sr-num">{d(s?.supply?.[st])}</span>
              </div>
            ))}
          </div>
        </div>
      </QuadCard>

      <QuadCard color="#ef4444" Icon={IconRejected} title="Rejected" to="/rejected">
        <div className="quad-stats cols-1">
          <div>
            <div className="stat-row">
              <span className="sr-lbl"><strong>Total Rejected</strong></span>
              <span className="sr-num">{d(s?.rejected?.total)}</span>
            </div>
            {rejTop.map((r) => (
              <div key={r.value} className="stat-row">
                <span className="sr-lbl"><span className="stage-dot" style={{ background: '#ef4444' }} />{r.label}</span>
                <span className="sr-num">{r.n}</span>
              </div>
            ))}
            {rejOthers > 0 && (
              <div className="stat-row">
                <span className="sr-lbl"><span className="stage-dot" style={{ background: '#94a3b8' }} />Others</span>
                <span className="sr-num">{rejOthers}</span>
              </div>
            )}
          </div>
        </div>
      </QuadCard>
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState('board'); // board | table

  const toggle = (
    <div className="view-toggle">
      <button className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}>Board</button>
      <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}>Table</button>
    </div>
  );

  return (
    <div>
      {view === 'board' ? (
        <>
          <div className="page-head"><h2>Summary</h2><div className="page-head-spacer" />{toggle}</div>
          <BoardView />
        </>
      ) : (
        <InventoryBoard toolbarExtra={toggle}
          extraStageGroups={[{ key: 'post_visit', label: 'Post Visit', stages: SUPPLY_STAGES, color: '#6366f1', before: 'rejected' }]} />
      )}
    </div>
  );
}
