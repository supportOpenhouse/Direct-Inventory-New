"""Home board summary — one scoped aggregate powering the Summary quadrants.

GET /api/home/summary returns the Leads, Follow Ups and Rejected quadrant
numbers in a single round-trip (the Pipeline quadrant uses the separate
post-token dataset and is computed client-side). Everything is visibility
scoped exactly like the inventory list (admin: all; manager: their cities;
rm: rows assigned to them).

Shape:
  {
    leads: { unqualified_new, unqualified_old, qualified_new, qualified_old },
    follow_ups: {
      follow_up:        { today, past, future },
      call_not_received:{ today, past, future },
    },
    rejected: { total, by_reason: { <reason>: n } },
  }

  unqualified = stage 'unqualified'; qualified = stage 'qualified'.
  For UNQUALIFIED, "new" = the listing arrived (created_at) today (IST), "old" =
  before today. For QUALIFIED, "new" = a user moved it to 'qualified' today
  (from activity_log), "old" = currently qualified but moved earlier — NOT keyed
  on created_at. Follow-up buckets compare follow_up_at against today (IST) and
  only count rows that have a follow_up_at.
"""
from __future__ import annotations

from flask import Blueprint, g, jsonify

from ..db import get_conn
from .auth import require_auth
from .inventory._common import _scope_clause

bp = Blueprint("home", __name__, url_prefix="/api/home")

# IST calendar today; created_at is TIMESTAMPTZ so convert to IST first.
_TODAY_IST = "(NOW() AT TIME ZONE 'Asia/Kolkata')::DATE"
_CREATED_IST = "(created_at AT TIME ZONE 'Asia/Kolkata')::DATE"

# A row counts as "qualified today" when its stage was moved to 'qualified' on
# today's IST date — read from activity_log, NOT from created_at (which is when
# the listing was ingested). Matches the Leads page "NEW" badge logic. Uses
# idx_activity_log_entity. Correlates on the un-aliased `inventory` table.
_QUALIFIED_TODAY = (
    "EXISTS (SELECT 1 FROM activity_log al "
    "WHERE al.entity_type = 'inventory' AND al.entity_id = inventory.oh_id "
    "AND al.action = 'stage_change' AND al.after_value = 'qualified' "
    f"AND (al.created_at AT TIME ZONE 'Asia/Kolkata')::DATE = {_TODAY_IST})"
)


@bp.get("/summary")
@require_auth()
def summary():
    scope, scope_params = _scope_clause(g.user)
    where = f"WHERE TRUE {scope}"

    conn = get_conn()
    try:
        with conn, conn.cursor() as cur:
            # Leads + follow-up buckets in one conditional-aggregation pass.
            cur.execute(
                f"""
                SELECT
                  COUNT(*) FILTER (WHERE stage IN ('unqualified', 'lead') AND {_CREATED_IST} = {_TODAY_IST}) AS unqualified_new,
                  COUNT(*) FILTER (WHERE stage IN ('unqualified', 'lead') AND {_CREATED_IST} < {_TODAY_IST}) AS unqualified_old,
                  COUNT(*) FILTER (WHERE stage = 'qualified' AND {_QUALIFIED_TODAY}) AS qualified_new,
                  COUNT(*) FILTER (WHERE stage = 'qualified' AND NOT {_QUALIFIED_TODAY}) AS qualified_old,

                  COUNT(*) FILTER (WHERE stage = 'follow_up' AND follow_up_at IS NOT NULL AND follow_up_at = {_TODAY_IST}) AS fu_today,
                  COUNT(*) FILTER (WHERE stage = 'follow_up' AND follow_up_at IS NOT NULL AND follow_up_at < {_TODAY_IST}) AS fu_past,
                  COUNT(*) FILTER (WHERE stage = 'follow_up' AND follow_up_at IS NOT NULL AND follow_up_at > {_TODAY_IST}) AS fu_future,

                  COUNT(*) FILTER (WHERE stage = 'call_not_received' AND follow_up_at IS NOT NULL AND follow_up_at = {_TODAY_IST}) AS cnr_today,
                  COUNT(*) FILTER (WHERE stage = 'call_not_received' AND follow_up_at IS NOT NULL AND follow_up_at < {_TODAY_IST}) AS cnr_past,
                  COUNT(*) FILTER (WHERE stage = 'call_not_received' AND follow_up_at IS NOT NULL AND follow_up_at > {_TODAY_IST}) AS cnr_future,

                  COUNT(*) FILTER (WHERE stage = 'rejected') AS rejected_total,

                  COUNT(*) FILTER (WHERE stage = 'pipeline') AS sup_pipeline,
                  COUNT(*) FILTER (WHERE stage = 'token_to_ama') AS sup_token_to_ama,
                  COUNT(*) FILTER (WHERE stage = 'onboarded') AS sup_onboarded,
                  COUNT(*) FILTER (WHERE stage = 'rejected_post_visit') AS sup_rejected_post_visit,
                  COUNT(*) FILTER (WHERE stage = 'cancelled_post_token') AS sup_cancelled_post_token
                FROM inventory
                {where}
                """,
                scope_params,
            )
            row = cur.fetchone()

            # Rejected breakdown by reason.
            cur.execute(
                f"""SELECT COALESCE(stage_reason, 'unspecified') AS reason, COUNT(*) AS n
                    FROM inventory
                    {where} AND stage = 'rejected'
                    GROUP BY COALESCE(stage_reason, 'unspecified')""",
                scope_params,
            )
            by_reason = {r["reason"]: r["n"] for r in cur.fetchall()}

        return jsonify({
            "leads": {
                "unqualified_new": row["unqualified_new"],
                "unqualified_old": row["unqualified_old"],
                "qualified_new": row["qualified_new"],
                "qualified_old": row["qualified_old"],
            },
            "follow_ups": {
                "follow_up": {
                    "today": row["fu_today"], "past": row["fu_past"], "future": row["fu_future"],
                },
                "call_not_received": {
                    "today": row["cnr_today"], "past": row["cnr_past"], "future": row["cnr_future"],
                },
            },
            "rejected": {"total": row["rejected_total"], "by_reason": by_reason},
            "supply": {
                "pipeline": row["sup_pipeline"],
                "token_to_ama": row["sup_token_to_ama"],
                "onboarded": row["sup_onboarded"],
                "rejected_post_visit": row["sup_rejected_post_visit"],
                "cancelled_post_token": row["sup_cancelled_post_token"],
            },
        })
    finally:
        conn.close()
