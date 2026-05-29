// Self-contained "acquired property" dataset for the Post-Token / Pipeline
// tracker (ported from frontend-example). This is a separate domain from the
// leads inventory and is wired to its own (later) backend table; for now it
// runs entirely on this mock dataset.

export const PROPERTY_STAGES = [
  { key: 'token_transferred', label: 'Token Transferred', color: '#6366f1' },
  { key: 'docs_received', label: 'Docs Received', color: '#3b82f6' },
  { key: 'review_status', label: 'Review Status', color: '#eab308' },
  { key: 'draft_ama', label: 'Draft AMA', color: '#f97316' },
  { key: 'seller_approval', label: 'Seller Approval', color: '#a855f7' },
  { key: 'ama_signed', label: 'AMA Signed', color: '#14b8a6' },
  { key: 'key_handover', label: 'Key Handover', color: '#22c55e' },
  { key: 'rejected', label: 'Rejected', color: '#ef4444' },
  { key: 'token_refunded', label: 'Token Refunded', color: '#fb923c' },
];
export const STAGE_MAP = Object.fromEntries(PROPERTY_STAGES.map((s) => [s.key, s]));
export const PROPERTY_CITIES = ['Gurgaon', 'Noida', 'Ghaziabad', 'Mumbai', 'Pune'];

export function computeStage(docs) {
  if (docs.keyHandoverDate) return 'key_handover';
  if (docs.amaSignedDate) return 'ama_signed';
  if (docs.sellerApproval === 'yes') return 'seller_approval';
  if (docs.draftAma === 'yes') return 'draft_ama';
  if (docs.reviewStatus) return 'review_status';
  if (docs.docsReceivedDate) return 'docs_received';
  return 'token_transferred';
}

export function formatCurrency(n) {
  if (n == null || n === '') return '—';
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(2)} Cr`;
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(2)} L`;
  return `₹${v.toLocaleString('en-IN')}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function formatPropDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const DOCS_FULL = { allotmentLetter: 'present', possessionLetter: 'present', bba: 'present', conveyanceDeed: 'present', carParkingLetter: 'present', noc: 'present', gpa: 'present', mutation: 'present' };

export const MOCK_PROPERTIES = [
  {
    id: 'prop-01', tokenDate: '2024-11-10', city: 'Gurgaon', society: 'DLF The Crest', tower: 'A', unit: '1204',
    config: '3 BHK', area: 1420, price: 185, registry: 'done', sellerName: 'Ramesh Joshi', sellerNri: false,
    amaDate: '2024-12-15', occupancy: 'vacant', keyHandover: '2024-12-28', internalRemarks: 'Smooth deal. Registry done early.',
    legalRemarks: '', flagged: false, stage: 'key_handover', floor: '12', parking: 'B-24', parkingLetter: true,
    propertyTaxNo: 'PT-2024-001', propertyTaxPaid: true, agreementType: 'Sale Deed', tokenAmount: 500000, acquisitionCost: 18500000,
    docs: DOCS_FULL, agreedPrice: 18500000, perfGuarantee: 200000, forfeitable: 100000, refundable: 100000,
    paymentStructure: 'Non Flexible', maintenanceCharge: 4500, electricityCharge: 800, poc: 'Suresh Agarwal', source: 'Direct',
    sellerPhone1: '9876543201', sellerPhone2: '', sellerBank: 'HDFC Bank', sellerAccount: 'XXXX1234', sellerIfsc: 'HDFC0001234',
    sellersOnRegistry: 'Ramesh Joshi, Sunita Joshi', panPresent: true, aadharFront: true, aadharBack: true, propertyDoc: true,
    hasLoan: false, outstandingLoan: 0, cersaiClearance: 'Satisfied',
    pipeline: { tokenDate: '2024-11-10', docsReceivedDate: '2024-11-18', reviewStatus: 'okay', reviewDate: '2024-11-22', draftAma: 'yes', draftAmaDate: '2024-11-28', sellerApproval: 'yes', sellerApprovalDate: '2024-12-02', amaSignedDate: '2024-12-15', keyHandoverDate: '2024-12-28', crmRemarks: 'Clean deal, all docs verified.' },
  },
  {
    id: 'prop-02', tokenDate: '2024-11-22', city: 'Noida', society: 'ATS Greens Village', tower: 'B', unit: '304',
    config: '2 BHK', area: 980, price: 72, registry: 'unregistered', sellerName: 'Priya Deshpande', sellerNri: true, sellerNriLocation: 'Dubai, UAE',
    amaDate: null, occupancy: 'rented', keyHandover: null, internalRemarks: 'NRI seller — POA obtained. Registry pending.',
    legalRemarks: 'Title clear. Mutation pending at sub-registrar.', flagged: true, stage: 'review_status', floor: '3', parking: 'P-12',
    propertyTaxNo: 'PT-2024-044', propertyTaxPaid: false, agreementType: 'Sale Deed', tokenAmount: 300000, acquisitionCost: 7200000,
    docs: { ...DOCS_FULL, gpa: 'missing', mutation: 'pending', noc: 'pending' }, agreedPrice: 7200000, perfGuarantee: 100000, forfeitable: 50000, refundable: 50000,
    paymentStructure: 'Non Flexible', maintenanceCharge: 2800, electricityCharge: 600, poc: 'Anil Kapoor', source: '99acres', broker: 'Sharma Realtors',
    sellerPhone1: '9876543202', sellerBank: 'ICICI Bank', sellerAccount: 'XXXX5678', sellerIfsc: 'ICIC0005678', sellersOnRegistry: 'Priya Deshpande',
    panPresent: true, aadharFront: true, aadharBack: false, propertyDoc: true, hasLoan: true, outstandingLoan: 2400000, loanBank: 'Axis Bank',
    loanLan: 'LAN99812', loanApplicant: 'Priya Deshpande', closurePlan: 'From sale proceeds', cersaiClearance: '—',
    pipeline: { tokenDate: '2024-11-22', docsReceivedDate: '2024-11-30', reviewStatus: 'flagged', reviewDate: '2024-12-04', discrepancyNote: 'Aadhaar back missing; mutation pending.', draftAma: '', crmRemarks: 'Awaiting docs resolution.' },
  },
  {
    id: 'prop-03', tokenDate: '2024-12-01', city: 'Gurgaon', society: 'M3M Golf Estate', tower: 'C', unit: '802',
    config: '3 BHK', area: 1650, price: 240, registry: 'done', sellerName: 'Vikram Singh', sellerNri: false,
    amaDate: null, occupancy: 'self', keyHandover: null, internalRemarks: 'Docs received, in review.', legalRemarks: '',
    flagged: false, stage: 'docs_received', floor: '8', parking: 'C-09', propertyTaxNo: 'PT-2024-090', propertyTaxPaid: true,
    agreementType: 'Sale Deed', tokenAmount: 600000, acquisitionCost: 24000000, docs: DOCS_FULL, agreedPrice: 24000000,
    perfGuarantee: 250000, forfeitable: 125000, refundable: 125000, paymentStructure: 'Non Flexible', maintenanceCharge: 5200,
    electricityCharge: 900, poc: 'Suresh Agarwal', source: 'Direct', sellerPhone1: '9876543203', sellerBank: 'SBI',
    sellerAccount: 'XXXX9012', sellerIfsc: 'SBIN0009012', sellersOnRegistry: 'Vikram Singh', panPresent: true, aadharFront: true,
    aadharBack: true, propertyDoc: true, hasLoan: false, outstandingLoan: 0, cersaiClearance: 'Satisfied',
    pipeline: { tokenDate: '2024-12-01', docsReceivedDate: '2024-12-09', crmRemarks: '' },
  },
  {
    id: 'prop-04', tokenDate: '2024-12-08', city: 'Pune', society: 'Green Park Residency', tower: 'D', unit: '1102',
    config: '2 BHK', area: 1050, price: 95, registry: 'under_process', sellerName: 'Sneha Gupta', sellerNri: false,
    amaDate: '2025-01-20', occupancy: 'vacant', keyHandover: null, internalRemarks: 'AMA drafted, awaiting seller sign-off.',
    legalRemarks: 'Registry under process.', flagged: false, stage: 'seller_approval', floor: '11', parking: 'D-31',
    propertyTaxNo: 'PT-2025-010', propertyTaxPaid: true, agreementType: 'Sale Deed', tokenAmount: 350000, acquisitionCost: 9500000,
    docs: { ...DOCS_FULL, mutation: 'pending' }, agreedPrice: 9500000, perfGuarantee: 120000, forfeitable: 60000, refundable: 60000,
    paymentStructure: 'Flexible', minPct: 10, maxPct: 30, initialPeriod: 30, gracePeriod: 15, rentalAmount: 22000,
    maintenanceCharge: 3100, electricityCharge: 700, poc: 'Anil Kapoor', source: 'MagicBricks', broker: 'Pune Homes',
    sellerPhone1: '9876543204', sellerBank: 'Kotak', sellerAccount: 'XXXX3456', sellerIfsc: 'KKBK0003456', sellersOnRegistry: 'Sneha Gupta, Arjun Gupta',
    panPresent: true, aadharFront: true, aadharBack: true, propertyDoc: true, hasLoan: false, outstandingLoan: 0, cersaiClearance: 'Satisfied',
    pipeline: { tokenDate: '2024-12-08', docsReceivedDate: '2024-12-15', reviewStatus: 'okay', reviewDate: '2024-12-18', draftAma: 'yes', draftAmaDate: '2024-12-22', sellerApproval: 'yes', sellerApprovalDate: '2025-01-04', crmRemarks: 'Seller approved AMA.' },
  },
  {
    id: 'prop-05', tokenDate: '2024-12-14', city: 'Noida', society: 'Mahagun Moderne', tower: 'E', unit: '506',
    config: '3 BHK', area: 1380, price: 130, registry: 'done', sellerName: 'Rahul Mehta', sellerNri: false,
    amaDate: '2025-01-28', occupancy: 'rented', keyHandover: null, internalRemarks: 'AMA signed, key handover scheduled.',
    legalRemarks: '', flagged: false, stage: 'ama_signed', floor: '5', parking: 'E-15', propertyTaxNo: 'PT-2025-022',
    propertyTaxPaid: true, agreementType: 'Sale Deed', tokenAmount: 400000, acquisitionCost: 13000000, docs: DOCS_FULL,
    agreedPrice: 13000000, perfGuarantee: 150000, forfeitable: 75000, refundable: 75000, paymentStructure: 'Non Flexible',
    maintenanceCharge: 3600, electricityCharge: 750, poc: 'Suresh Agarwal', source: 'Direct', sellerPhone1: '9876543205',
    sellerBank: 'HDFC Bank', sellerAccount: 'XXXX7788', sellerIfsc: 'HDFC0007788', sellersOnRegistry: 'Rahul Mehta', panPresent: true,
    aadharFront: true, aadharBack: true, propertyDoc: true, hasLoan: false, outstandingLoan: 0, cersaiClearance: 'Satisfied',
    pipeline: { tokenDate: '2024-12-14', docsReceivedDate: '2024-12-20', reviewStatus: 'okay', reviewDate: '2024-12-23', draftAma: 'yes', draftAmaDate: '2024-12-28', sellerApproval: 'yes', sellerApprovalDate: '2025-01-06', amaSignedDate: '2025-01-28', crmRemarks: '' },
  },
  {
    id: 'prop-06', tokenDate: '2025-01-03', city: 'Gurgaon', society: 'Ireo Victory Valley', tower: 'F', unit: '210',
    config: '2 BHK', area: 1120, price: 110, registry: 'done', sellerName: 'Kavita Rao', sellerNri: false,
    amaDate: null, occupancy: 'vacant', keyHandover: null, internalRemarks: 'Just tokenised.', legalRemarks: '', flagged: false,
    stage: 'token_transferred', floor: '2', parking: 'F-04', propertyTaxNo: 'PT-2025-040', propertyTaxPaid: false,
    agreementType: 'Sale Deed', tokenAmount: 300000, acquisitionCost: 11000000, docs: { allotmentLetter: 'present', possessionLetter: 'pending', bba: 'present', conveyanceDeed: 'missing', carParkingLetter: 'present', noc: 'pending', gpa: 'missing', mutation: 'missing' },
    agreedPrice: 11000000, perfGuarantee: 120000, forfeitable: 60000, refundable: 60000, paymentStructure: 'Non Flexible',
    maintenanceCharge: 3000, electricityCharge: 650, poc: 'Anil Kapoor', source: 'Housing.com', broker: 'NCR Estates',
    sellerPhone1: '9876543206', sellerBank: 'Yes Bank', sellerAccount: 'XXXX2233', sellerIfsc: 'YESB0002233', sellersOnRegistry: 'Kavita Rao',
    panPresent: true, aadharFront: false, aadharBack: false, propertyDoc: false, hasLoan: false, outstandingLoan: 0, cersaiClearance: '—',
    pipeline: { tokenDate: '2025-01-03', crmRemarks: 'Docs collection in progress.' },
  },
  {
    id: 'prop-07', tokenDate: '2025-01-09', city: 'Ghaziabad', society: 'Gaur City 2', tower: 'G', unit: '1407',
    config: '3 BHK', area: 1290, price: 88, registry: 'done', sellerName: 'Imran Sheikh', sellerNri: false,
    amaDate: null, occupancy: 'vacant', keyHandover: null, internalRemarks: 'Draft AMA shared.', legalRemarks: '', flagged: false,
    stage: 'draft_ama', floor: '14', parking: 'G-22', propertyTaxNo: 'PT-2025-051', propertyTaxPaid: true, agreementType: 'Sale Deed',
    tokenAmount: 250000, acquisitionCost: 8800000, docs: DOCS_FULL, agreedPrice: 8800000, perfGuarantee: 100000, forfeitable: 50000,
    refundable: 50000, paymentStructure: 'Non Flexible', maintenanceCharge: 2600, electricityCharge: 600, poc: 'Suresh Agarwal',
    source: 'Direct', sellerPhone1: '9876543207', sellerBank: 'PNB', sellerAccount: 'XXXX4455', sellerIfsc: 'PUNB0004455',
    sellersOnRegistry: 'Imran Sheikh', panPresent: true, aadharFront: true, aadharBack: true, propertyDoc: true, hasLoan: false,
    outstandingLoan: 0, cersaiClearance: 'Satisfied',
    pipeline: { tokenDate: '2025-01-09', docsReceivedDate: '2025-01-15', reviewStatus: 'okay', reviewDate: '2025-01-18', draftAma: 'yes', draftAmaDate: '2025-01-22', crmRemarks: '' },
  },
  {
    id: 'prop-08', tokenDate: '2025-01-12', city: 'Mumbai', society: 'Skyline Heights', tower: 'H', unit: '905',
    config: '2 BHK', area: 760, price: 165, registry: 'unregistered', sellerName: 'Deepa Nair', sellerNri: false,
    amaDate: null, occupancy: 'occupied', keyHandover: null, internalRemarks: 'Token refunded — seller backed out.',
    legalRemarks: 'Deal cancelled.', flagged: false, stage: 'token_refunded', floor: '9', parking: '—', propertyTaxNo: '',
    propertyTaxPaid: false, agreementType: '—', tokenAmount: 400000, acquisitionCost: 16500000, docs: { allotmentLetter: 'present', possessionLetter: 'missing', bba: 'missing', conveyanceDeed: 'missing', carParkingLetter: 'missing', noc: 'missing', gpa: 'missing', mutation: 'missing' },
    agreedPrice: 16500000, perfGuarantee: 0, forfeitable: 0, refundable: 400000, paymentStructure: 'Non Flexible', maintenanceCharge: 0,
    electricityCharge: 0, poc: 'Anil Kapoor', source: '99acres', broker: 'Mumbai Prime', sellerPhone1: '9876543208', sellerBank: '',
    sellerAccount: '', sellerIfsc: '', sellersOnRegistry: 'Deepa Nair', panPresent: true, aadharFront: true, aadharBack: true,
    propertyDoc: false, hasLoan: false, outstandingLoan: 0, cersaiClearance: '—',
    pipeline: { tokenDate: '2025-01-12', crmRemarks: 'Token refunded on 20 Jan.' },
  },
];

export const DEFAULT_FILTERS = { search: '', stages: [], flagged: false, city: '', dateFrom: '', dateTo: '' };

export function applyPropertyFilters(properties, filters) {
  return properties.filter((p) => {
    if (filters.stages?.length && !filters.stages.includes(p.stage)) return false;
    if (filters.flagged && !p.flagged) return false;
    if (filters.city && p.city !== filters.city) return false;
    if (filters.dateFrom && p.tokenDate < filters.dateFrom) return false;
    if (filters.dateTo && p.tokenDate > filters.dateTo) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!`${p.society} ${p.unit} ${p.sellerName} ${p.poc}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}
