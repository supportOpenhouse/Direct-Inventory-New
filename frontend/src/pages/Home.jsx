import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { stageLabel } from '../utils/format.js';
import InventoryBoard from '../components/InventoryBoard.jsx';
import { IconLeads, IconFollowUp, IconPipeline, IconToken } from '../components/icons.jsx';

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
    <section className="quad-card" style={{ '--qc': color }}>
      <div className="quad-head">
        <span className="qh-ic" style={{ background: `${color}1a`, color }}><Icon size={20} /></span>
        <h3>{title}</h3>
        {to && <Link to={to} className="qh-link">View →</Link>}
      </div>
      {children}
    </section>
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

  return (
    <div className="home-quad">
      <QuadCard color="#fa541c" Icon={IconLeads} title="Leads" to="/leads">
        <div className="quad-stats">
          <StatTile num={d(s?.leads?.new)} label="New Leads · added today" accent />
          <StatTile num={d(s?.leads?.pending)} label="Pending Leads · older" />
        </div>
      </QuadCard>

      <QuadCard color="#f97316" Icon={IconFollowUp} title="Follow Ups" to="/follow-ups">
        <div className="quad-stats">
          <StatTile num={d(s?.follow_ups?.today)} label="Today's Follow Ups" accent />
          <StatTile num={d(s?.follow_ups?.pending)} label="Pending · overdue" />
        </div>
      </QuadCard>

      <QuadCard color="#a855f7" Icon={IconPipeline} title="Pipeline" to="/pipeline">
        <div className="quad-stats">
          <StatTile num={d(s?.pipeline?.call_not_received)} label="Call Not Received" />
          <StatTile num={d(s?.pipeline?.future_follow_ups)} label="Future Follow Ups" />
        </div>
      </QuadCard>

      <QuadCard color="#16a34a" Icon={IconToken} title="Post Token" to="/post-token">
        <div className="quad-stats cols-1">
          <div>
            {Object.entries(s?.post_token?.by_stage || {}).map(([stage, n]) => (
              <div key={stage} className="stat-row">
                <span className="sr-lbl"><span className="stage-dot" style={{ background: '#16a34a' }} />{stageLabel(stage)}</span>
                <span className="sr-num">{n}</span>
              </div>
            ))}
            {(!s || Object.keys(s?.post_token?.by_stage || {}).length === 0) && <div className="muted" style={{ padding: 8 }}>Connected later.</div>}
          </div>
        </div>
      </QuadCard>
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState('board'); // board | table

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Home</h2>
          <div className="ph-sub">Your inventory at a glance.</div>
        </div>
        <div className="page-head-spacer" />
        <div className="view-toggle">
          <button className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}>Board</button>
          <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}>Table</button>
        </div>
      </div>

      {view === 'board' ? <BoardView /> : <InventoryBoard />}
    </div>
  );
}
