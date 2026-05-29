// Local "today" as YYYY-MM-DD (good for <input type="date" min={...}>).
// Local date (not UTC) so IST users don't see the wrong floor in the early hours.
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatPrice(p) {
  if (p == null) return '—';
  const n = Number(p);
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

// "DD MMM YYYY" with a 3-letter month. Accepts RFC-2822 (what Flask jsonifies
// datetimes to) or YYYY-MM-DD. DATE columns serialize to UTC midnight, so read
// UTC parts to avoid drifting a day in IST.
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function formatDateShort(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${day} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// A DATE column (follow_up_at) serializes to UTC midnight; reading UTC parts
// gives its calendar date. As a YYYY-MM-DD string for cheap comparisons.
export function dateOnly(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function isDateBeforeToday(iso) {
  const day = dateOnly(iso);
  return day != null && day < todayISO();
}
export function isDateToday(iso) {
  return dateOnly(iso) === todayISO();
}
export function isDateAfterToday(iso) {
  const day = dateOnly(iso);
  return day != null && day > todayISO();
}

// Whole days between `iso` and now, floored. 0 = within the last 24h.
function daysAgo(iso) {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  return Math.floor((Date.now() - then.getTime()) / 86400_000);
}

// True when created_at is on today's local calendar date — drives the "NEW"
// badge on the Leads board.
export function isCreatedToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return local === todayISO();
}

// Attention flag for a row's identity cells. See InventoryTable.
export function rowFlag(item) {
  if (!item) return null;
  if (item.stage === 'follow_up' && isDateBeforeToday(item.follow_up_at)) return 'yellow';
  if (item.stage === 'lead' || item.stage === 'qualified') {
    const d = daysAgo(item.created_at);
    if (d != null && d >= 1) return 'red';
  }
  return null;
}

export function formatDateRel(iso) {
  if (!iso) return '—';
  const days = daysAgo(iso);
  if (days == null) return String(iso);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function stageLabel(s) {
  return ({
    lead: 'Lead',
    qualified: 'Qualified',
    call_not_received: 'Call Not Received',
    follow_up: 'Follow Up',
    visit_scheduled: 'Visit Scheduled',
    rejected: 'Rejected',
    // Legacy labels — kept so historical activity-log rows still render.
    follow_up_cnr: 'Follow Up (CNR)',
    visit_completed: 'Visit Completed',
    offer_given: 'Offer Given',
    unreachable: 'Unreachable',
  })[s] || s;
}

// Board-visible stages, in display order. `lead` = unacted intake (Leads
// page, left column); `qualified` = acted (right column). Drives count pills,
// stage dropdowns, and analytics order.
export const STAGES = [
  'lead',
  'qualified',
  'call_not_received',
  'follow_up',
  'visit_scheduled',
  'rejected',
];

export const STAGE_DOT_COLOR = {
  lead: '#fa541c',
  qualified: '#16a34a',
  call_not_received: '#facc15',
  follow_up: '#f97316',
  visit_scheduled: '#a855f7',
  rejected: '#ef4444',
  // Legacy
  follow_up_cnr: '#facc15',
  visit_completed: '#22c55e',
  offer_given: '#fb923c',
  unreachable: '#94a3b8',
};

// Reject reasons for the Leads flow. Written to inventory.reject_reason
// alongside stage='rejected'.
export const REJECT_REASONS = [
  { value: 'ground_floor', label: 'Ground Floor' },
  { value: 'listing_removed', label: 'Listing Removed' },
  { value: 'duplicate', label: 'Duplicate' },
];

export function rejectReasonLabel(code) {
  if (!code) return '';
  return REJECT_REASONS.find((r) => r.value === code)?.label || code;
}

// Greater Noida is rolled up into Noida everywhere in the UI.
export const CITIES = ['Gurgaon', 'Noida', 'Ghaziabad'];
export function displayCity(city) {
  if (!city) return '';
  if (city === 'Greater Noida') return 'Noida';
  return city;
}

export const MANUAL_SOURCES = new Set(['Website', 'manual']);
export function isManualSource(src) {
  if (!src) return false;
  return MANUAL_SOURCES.has(src);
}

// Star color rendered for a row. Manual override (star_color) wins; otherwise
// priority -> yellow, cp_match -> green/red, else null.
//   star_color === 'none' -> manual blank (suppress default rules)
//   star_color === null   -> no override, apply defaults
export function starColor(item) {
  if (!item) return null;
  const sc = item.star_color;
  if (sc === 'red' || sc === 'green' || sc === 'yellow') return sc;
  if (sc === 'none') return null;
  if (item.priority) return 'yellow';
  if (item.cp_match === 'perfect') return 'green';
  if (item.cp_match === 'partial') return 'red';
  return null;
}

// Variation = (asking - oh_price) / oh_price * 100, signed.
// sign 'pos' = asking OVER OH; 'neg' = UNDER OH; 'flat' for |pct| < 0.5.
export function variation(asking, oh) {
  const a = Number(asking);
  const o = Number(oh);
  if (!Number.isFinite(a) || !Number.isFinite(o) || o === 0) return null;
  const pct = ((a - o) / o) * 100;
  const sign = Math.abs(pct) < 0.5 ? 'flat' : (pct > 0 ? 'pos' : 'neg');
  const label = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
  return { pct, label, sign };
}
