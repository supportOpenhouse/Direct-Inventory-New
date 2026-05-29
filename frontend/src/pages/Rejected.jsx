import InventoryBoard from '../components/InventoryBoard.jsx';

// Functional already: the board scoped to rejected leads. Stage pills are
// hidden since the stage is fixed; reject reasons surface in the expand panel.
export default function Rejected() {
  return (
    <div>
      <div className="page-head">
        <div>
          <h2>Rejected</h2>
          <div className="ph-sub">Leads marked rejected, with their reason.</div>
        </div>
      </div>
      <InventoryBoard fixedStages={['rejected']} showAdd={false} stageFilterable={false} />
    </div>
  );
}
