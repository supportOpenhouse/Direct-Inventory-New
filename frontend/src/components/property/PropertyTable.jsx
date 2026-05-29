import { Fragment, useState } from 'react';
import { computeStage, formatCurrency, formatPropDate, STAGE_MAP } from '../../data/properties.js';
import { IconChevron, IconExternal } from '../icons.jsx';

/* ── status pill ─────────────────────────────────────────────────────── */
export function PropertyStatusPill({ stage }) {
  const meta = STAGE_MAP[stage];
  if (!meta) return null;
  return (
    <span className="prop-pill" style={{ '--pc': meta.color }}>
      <span className="prop-pill-dot" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

function RegistryCell({ value }) {
  if (!value) return <span className="muted">—</span>;
  const map = {
    done: { icon: '✓', label: 'Done', cls: 'reg-done' },
    unregistered: { icon: '⚠', label: 'Unregistered', cls: 'reg-bad' },
    under_process: { icon: '⏳', label: 'Under process', cls: 'reg-warn' },
  };
  const r = map[value] || { icon: '—', label: value, cls: '' };
  return <span className={`reg-chip ${r.cls}`}>{r.icon} {r.label}</span>;
}

function OccupancyCell({ value }) {
  if (!value) return <span className="muted">—</span>;
  const map = { vacant: ['#22c55e', 'Vacant'], rented: ['#f59e0b', 'Rented'], self: ['#a855f7', 'Self'], occupied: ['#ef4444', 'Occupied'] };
  const [c, label] = map[value] || ['#94a3b8', value];
  return <span className="occ-cell"><span className="occ-dot" style={{ background: c }} />{label}</span>;
}

/* ── expand sections ─────────────────────────────────────────────────── */
function Field({ label, children }) {
  return <div className="field-row"><span className="field-lbl">{label}</span><span className="field-val">{children ?? '—'}</span></div>;
}

const DOC_LABELS = { allotmentLetter: 'Allotment Letter', possessionLetter: 'Possession Letter', bba: 'BBA', conveyanceDeed: 'Conveyance / Sale Deed', carParkingLetter: 'Car Parking Letter', noc: 'NOC', gpa: 'GPA', mutation: 'Mutation' };
function DocPill({ label, status }) { return <span className={`doc-pill doc-${status}`}>{label}</span>; }

function Seg({ options, value, onChange, disabled }) {
  return (
    <div className={`seg ${disabled ? 'seg-disabled' : ''}`}>
      {options.map((o) => (
        <button key={o.v} type="button" disabled={disabled}
          className={`seg-btn ${value === o.v ? `seg-on seg-${o.tone}` : ''}`}
          onClick={() => onChange(o.v)}>{o.label}</button>
      ))}
    </div>
  );
}

function PropertySection({ property: p, onUpdate }) {
  const [taxPaid, setTaxPaid] = useState(p.propertyTaxPaid ?? false);
  return (
    <div className="expand-sec">
      <h4>🏠 Property</h4>
      <Field label="Unit">{p.unit}</Field>
      {p.tower && <Field label="Tower / Floor">{p.tower} – {p.floor}</Field>}
      <Field label="Size">{p.area ? `${p.area} sqft` : '—'}</Field>
      <Field label="Config">{p.config}</Field>
      <Field label="Parking">{p.parking || '—'}</Field>
      <Field label="Property Tax No.">{p.propertyTaxNo || '—'}</Field>
      <div className="field-row">
        <span className="field-lbl">Property Tax</span>
        <Seg options={[{ v: true, label: 'Paid', tone: 'ok' }, { v: false, label: 'Unpaid', tone: 'bad' }]} value={taxPaid} onChange={(v) => { setTaxPaid(v); onUpdate?.(p.id, { propertyTaxPaid: v }); }} />
      </div>
      <Field label="Agreement Type">{p.agreementType}</Field>
      <Field label="Token Amount">{formatCurrency(p.tokenAmount)}</Field>
      <Field label="Acquisition Cost"><span className="val-var-pos">{formatCurrency(p.acquisitionCost)}</span></Field>
      <div className="field-row">
        <span className="field-lbl">Documents</span>
        <div className="doc-pills">{Object.entries(p.docs || {}).map(([k, s]) => <DocPill key={k} label={DOC_LABELS[k] || k} status={s} />)}</div>
      </div>
    </div>
  );
}

function DealTermsSection({ property: p }) {
  const flexible = p.paymentStructure !== 'Non Flexible';
  return (
    <div className="expand-sec">
      <h4>💰 Deal Terms</h4>
      <Field label="Agreed Price"><span className="val-green">{formatCurrency(p.agreedPrice)}</span></Field>
      <Field label="Performance Guarantee">{formatCurrency(p.perfGuarantee)}</Field>
      <Field label="Forfeitable">{formatCurrency(p.forfeitable)}</Field>
      <Field label="Refundable">{formatCurrency(p.refundable)}</Field>
      <Field label="Payment Structure">{p.paymentStructure}</Field>
      {flexible && <>
        <Field label="Min / Max %">{p.minPct ?? '—'}% / {p.maxPct ?? '—'}%</Field>
        <Field label="Initial / Grace">{p.initialPeriod ?? '—'}d / {p.gracePeriod ?? '—'}d</Field>
        <Field label="Rental">{formatCurrency(p.rentalAmount)}</Field>
      </>}
      <Field label="Maintenance">{p.maintenanceCharge ? `₹${p.maintenanceCharge}/mo` : '—'}</Field>
      <Field label="POC">{p.poc}</Field>
      <Field label="Source">{p.source}</Field>
      {p.source !== 'Direct' && p.broker && <Field label="Broker">{p.broker}</Field>}
    </div>
  );
}

function DocLink({ label, present }) {
  return <div className="doc-link-row"><span>{label}</span>{present ? <span className="doc-link-yes">View <IconExternal size={11} /></span> : <span className="doc-link-no">No</span>}</div>;
}
function SellerSection({ property: p }) {
  return (
    <div className="expand-sec">
      <h4>👤 Seller</h4>
      <Field label="Seller(s)">{p.sellerName}</Field>
      <Field label="Status">{p.sellerNri ? <span><span className="nri-tag">NRI</span> {p.sellerNriLocation || ''}</span> : 'Resident'}</Field>
      <Field label="Sellers on Registry">{p.sellersOnRegistry}</Field>
      <Field label="Phone 1">{p.sellerPhone1}</Field>
      {p.sellerPhone2 && <Field label="Phone 2">{p.sellerPhone2}</Field>}
      <Field label="Bank">{p.sellerBank || '—'}</Field>
      <Field label="A/c · IFSC">{[p.sellerAccount, p.sellerIfsc].filter(Boolean).join(' · ') || '—'}</Field>
      <div className="field-row">
        <span className="field-lbl">Owner Documents</span>
        <div className="doc-link-list">
          <DocLink label="PAN Card" present={p.panPresent} />
          <DocLink label="Aadhaar (Front)" present={p.aadharFront} />
          <DocLink label="Aadhaar (Back)" present={p.aadharBack} />
          <DocLink label="Property Doc" present={p.propertyDoc} />
        </div>
      </div>
    </div>
  );
}

function LoanLegalSection({ property: p, onUpdate }) {
  const [cersai, setCersai] = useState(p.cersaiClearance ?? '—');
  return (
    <div className="expand-sec">
      <h4>🏦 Loan &amp; Legal</h4>
      {p.hasLoan && p.outstandingLoan > 0 ? (
        <>
          <Field label="Outstanding Loan"><span className="val-var-pos">{formatCurrency(p.outstandingLoan)}</span></Field>
          <Field label="Bank">{p.loanBank}</Field>
          <Field label="LAN">{p.loanLan}</Field>
          <Field label="Closure Plan">{p.closurePlan}</Field>
          <div className="doc-link-list">
            <DocLink label="Sanction Letter" present />
            <DocLink label="SOA" present />
            <DocLink label="LOD" present />
          </div>
        </>
      ) : <Field label="Outstanding Loan"><span className="val-green">No Loan</span></Field>}
      <div className="field-row">
        <span className="field-lbl">Cersai Clearance</span>
        <select value={cersai} onChange={(e) => { setCersai(e.target.value); onUpdate?.(p.id, { cersaiClearance: e.target.value }); }}>
          {['—', 'Satisfied', 'Unsatisfied'].map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    </div>
  );
}

function DateInput({ value, onChange, disabled }) {
  return <input type="date" value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="seg-date" />;
}
function DocumentsSection({ property, onUpdate }) {
  const [pl, setPl] = useState({ ...property.pipeline });
  const [waSent, setWaSent] = useState(false);
  const update = (field, val) => {
    const next = { ...pl, [field]: val };
    setPl(next);
    onUpdate?.(property.id, { pipeline: next, stage: computeStage(next) });
  };
  const canSignAma = pl.sellerApproval === 'yes' && pl.draftAma === 'yes' && pl.reviewStatus === 'okay';
  const Row = ({ label, children }) => <div className="field-row"><span className="field-lbl">{label}</span><div>{children}</div></div>;
  return (
    <div className="expand-sec">
      <h4>📄 Documents &amp; Timeline</h4>
      <Row label="Token Transferred"><span className="muted" style={{ fontSize: 12 }}>{formatPropDate(pl.tokenDate)}</span></Row>
      <Row label="Docs Received"><DateInput value={pl.docsReceivedDate} onChange={(v) => update('docsReceivedDate', v)} /></Row>
      <Row label="Review Status">
        <Seg options={[{ v: 'okay', label: 'Okay', tone: 'ok' }, { v: 'flagged', label: '🚩 Flagged', tone: 'warn' }]} value={pl.reviewStatus} onChange={(v) => update('reviewStatus', v)} />
        {pl.reviewStatus === 'flagged' && (
          <div style={{ marginTop: 8 }}>
            <textarea rows={2} value={pl.discrepancyNote ?? ''} onChange={(e) => update('discrepancyNote', e.target.value)} placeholder="Describe the discrepancy…" />
            <button type="button" className={`wa-btn ${waSent ? 'wa-sent' : ''}`} onClick={() => setWaSent(true)}>{waSent ? '✓ WhatsApp Sent' : '📤 Send WhatsApp'}</button>
          </div>
        )}
      </Row>
      <Row label="Draft AMA"><Seg options={[{ v: 'yes', label: 'Yes', tone: 'ok' }, { v: 'no', label: 'No', tone: 'bad' }]} value={pl.draftAma} onChange={(v) => update('draftAma', v)} disabled={!pl.reviewStatus || pl.reviewStatus === 'flagged'} /></Row>
      <Row label="Seller Approval"><Seg options={[{ v: 'yes', label: 'Yes', tone: 'ok' }, { v: 'no', label: 'No', tone: 'bad' }]} value={pl.sellerApproval} onChange={(v) => update('sellerApproval', v)} disabled={pl.draftAma !== 'yes'} /></Row>
      <Row label="AMA Signed"><DateInput value={pl.amaSignedDate} onChange={(v) => update('amaSignedDate', v)} disabled={!canSignAma} /></Row>
      <Row label="Key Handover"><DateInput value={pl.keyHandoverDate} onChange={(v) => update('keyHandoverDate', v)} disabled={!pl.amaSignedDate} /></Row>
      <div className="field-row"><span className="field-lbl">CRM Remarks</span><textarea rows={2} value={pl.crmRemarks ?? ''} onChange={(e) => update('crmRemarks', e.target.value)} placeholder="Internal notes…" /></div>
    </div>
  );
}

export function PropertyExpandPanel({ property, onUpdate, colSpan }) {
  return (
    <tr className="expand-row">
      <td colSpan={colSpan}>
        <div className="expand-inner">
          <PropertySection property={property} onUpdate={onUpdate} />
          <DealTermsSection property={property} />
          <SellerSection property={property} />
          <LoanLegalSection property={property} onUpdate={onUpdate} />
          <DocumentsSection property={property} onUpdate={onUpdate} />
        </div>
      </td>
    </tr>
  );
}

/* ── detail table ────────────────────────────────────────────────────── */
function rowTint(p) {
  if (p.stage === 'token_refunded') return 'pt-tint-orange';
  if (p.registry === 'unregistered') return 'pt-tint-red';
  if (p.registry === 'under_process') return 'pt-tint-amber';
  return '';
}

export default function PropertyTable({ properties = [], onUpdate, emptyTitle = 'No properties found' }) {
  const [expandedId, setExpandedId] = useState(null);
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const cols = 15;

  const sorted = sort.key
    ? [...properties].sort((a, b) => {
        const cmp = String(a[sort.key] ?? '').localeCompare(String(b[sort.key] ?? ''), undefined, { numeric: true });
        return sort.dir === 'asc' ? cmp : -cmp;
      })
    : properties;

  const TH = ({ col, children, align }) => {
    const active = sort.key === col;
    return (
      <th className={`inv-th ${align === 'right' ? 'inv-th-right' : ''} ${col ? 'inv-th-sortable' : ''} ${active ? 'inv-th-active' : ''}`}
        onClick={col ? () => setSort((s) => ({ key: col, dir: s.key === col && s.dir === 'asc' ? 'desc' : 'asc' })) : undefined}>
        {children}{col && <span className={active ? 'inv-th-arrow-active' : 'inv-th-arrow'}> {active ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}</span>}
      </th>
    );
  };

  return (
    <div className="inv-table-wrap">
      <table className="inv-table" style={{ minWidth: 1200 }}>
        <thead>
          <tr>
            <th className="inv-th" style={{ width: 34 }} />
            <TH col="tokenDate">Token Date</TH>
            <TH col="city">City</TH>
            <TH col="society">Society / Unit</TH>
            <TH col="config">Config</TH>
            <TH col="area">Area</TH>
            <TH col="price" align="right">Price</TH>
            <TH col="registry">Registry</TH>
            <TH col="sellerName">Seller</TH>
            <TH col="stage">Status</TH>
            <TH col="amaDate">AMA Date</TH>
            <TH col="occupancy">Occupancy</TH>
            <TH col="keyHandover">Key Handover</TH>
            <TH>Internal Remarks</TH>
            <TH>Legal Remarks</TH>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && <tr><td className="inv-empty" colSpan={cols}>{emptyTitle}</td></tr>}
          {sorted.map((p) => {
            const isOpen = expandedId === p.id;
            return (
              <Fragment key={p.id}>
                <tr className={`inv-row ${rowTint(p)} ${isOpen ? 'inv-row-open' : ''}`} onClick={() => setExpandedId(isOpen ? null : p.id)}>
                  <td className="inv-td-star">{p.flagged ? <span title="Flagged">🚩</span> : <span className={`pt-chev ${isOpen ? 'open' : ''}`}><IconChevron size={15} /></span>}</td>
                  <td className="inv-td-muted">{formatPropDate(p.tokenDate)}</td>
                  <td><span className="city-chip">{p.city?.toUpperCase()}</span></td>
                  <td className="inv-td-society">{p.society}<div className="inv-td-muted" style={{ fontWeight: 400, fontSize: 12 }}>{p.tower ? `${p.tower} – ` : ''}{p.unit}</div></td>
                  <td>{p.config}</td>
                  <td>{p.area ? `${p.area} sqft` : '—'}</td>
                  <td className="inv-td-num val-orange">{p.price ? `₹${p.price}L` : '—'}</td>
                  <td><RegistryCell value={p.registry} /></td>
                  <td>{p.sellerName}{p.sellerNri && <span className="nri-tag" style={{ marginLeft: 6 }}>NRI</span>}</td>
                  <td><PropertyStatusPill stage={p.stage} /></td>
                  <td className="inv-td-muted">{formatPropDate(p.amaDate)}</td>
                  <td><OccupancyCell value={p.occupancy} /></td>
                  <td className="inv-td-muted">{formatPropDate(p.keyHandover)}</td>
                  <td className="pt-remarks">{p.internalRemarks || '—'}</td>
                  <td onClick={(e) => e.stopPropagation()} style={{ minWidth: 160 }}>
                    <textarea className="pt-legal" rows={2} defaultValue={p.legalRemarks} placeholder="Add remark…" onBlur={(e) => onUpdate?.(p.id, { legalRemarks: e.target.value })} />
                  </td>
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
