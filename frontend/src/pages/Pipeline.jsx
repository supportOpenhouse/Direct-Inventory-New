import InventoryBoard from '../components/InventoryBoard.jsx';

// Pipeline = the lead pipeline, using our lead statuses (Lead, Qualified,
// Call Not Received, Follow Up, Visit Scheduled, Rejected) — NOT the
// post-token acquisition stages. Detail board with search, stage filter
// chips, and click-to-expand rows (Property / Pricing / Seller / Notes +
// Edit Status).
export default function Pipeline() {
  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Pipeline</h2>
          <div className="ph-sub">Leads moving through the pipeline, by status.</div>
        </div>
      </div>
      <InventoryBoard showAdd={false} />
    </div>
  );
}
