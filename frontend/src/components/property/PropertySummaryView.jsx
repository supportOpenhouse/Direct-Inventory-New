import { Fragment, useState } from 'react';
import { formatPropDate } from '../../data/properties.js';
import { PropertyExpandPanel, PropertyStatusPill } from './PropertyTable.jsx';

function SumCell({ value, date, flagged, comment }) {
  if (flagged) {
    return <div className="sum-cell"><span className="sum-flag">🚩 Flagged</span>{comment && <span className="sum-flag-note">{comment}</span>}</div>;
  }
  if (!value) return <span className="sum-na">—</span>;
  const future = date && new Date(date) > new Date();
  const isYes = ['Yes', 'yes', 'okay', 'Okay'].includes(value);
  const isNo = ['No', 'no'].includes(value);
  return (
    <div className="sum-cell">
      <span className={`sum-tag ${future ? 'sum-future' : isYes ? 'sum-yes' : isNo ? 'sum-no' : 'sum-neutral'}`}>{value}</span>
      {date && <span className="sum-date">{formatPropDate(date)}</span>}
    </div>
  );
}

export default function PropertySummaryView({ properties = [], onUpdate }) {
  const [expandedId, setExpandedId] = useState(null);
  const cols = 9;
  return (
    <div className="inv-table-wrap">
      <table className="inv-table sum-table" style={{ minWidth: 900 }}>
        <thead className="sum-thead">
          <tr>
            {['Token Date', 'Property Details', 'Docs Received', 'Review Status', 'Draft AMA', 'Seller Approval', 'AMA Signed', 'Key Handover', 'Status'].map((h) => <th key={h} className="sum-th">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {properties.length === 0 && <tr><td className="inv-empty" colSpan={cols}>No properties match the current filters.</td></tr>}
          {properties.map((p, idx) => {
            const isOpen = expandedId === p.id;
            const pl = p.pipeline ?? {};
            return (
              <Fragment key={p.id}>
                <tr className={`inv-row sum-row ${idx % 2 ? 'sum-zebra' : ''} ${p.stage === 'token_refunded' ? 'pt-tint-orange' : ''} ${isOpen ? 'inv-row-open' : ''}`} onClick={() => setExpandedId(isOpen ? null : p.id)}>
                  <td className="sum-td">{formatPropDate(p.tokenDate)}</td>
                  <td className="sum-td"><strong>{p.society}</strong><div className="inv-td-muted" style={{ fontSize: 11 }}>{p.tower ? `${p.tower} – ` : ''}{p.unit} · {p.config}</div></td>
                  <td className="sum-td"><SumCell value={pl.docsReceivedDate ? 'Yes' : null} date={pl.docsReceivedDate} /></td>
                  <td className="sum-td"><SumCell value={pl.reviewStatus === 'okay' ? 'Okay' : null} date={pl.reviewDate} flagged={pl.reviewStatus === 'flagged'} comment={pl.discrepancyNote} /></td>
                  <td className="sum-td"><SumCell value={pl.draftAma === 'yes' ? 'Yes' : pl.draftAma === 'no' ? 'No' : null} date={pl.draftAmaDate} /></td>
                  <td className="sum-td"><SumCell value={pl.sellerApproval === 'yes' ? 'Yes' : pl.sellerApproval === 'no' ? 'No' : null} date={pl.sellerApprovalDate} /></td>
                  <td className="sum-td"><SumCell value={pl.amaSignedDate ? 'Yes' : null} date={pl.amaSignedDate} /></td>
                  <td className="sum-td"><SumCell value={pl.keyHandoverDate ? 'Yes' : null} date={pl.keyHandoverDate} /></td>
                  <td className="sum-td"><PropertyStatusPill stage={p.stage} /></td>
                </tr>
                {isOpen && <PropertyExpandPanel property={p} onUpdate={onUpdate} colSpan={cols} />}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
