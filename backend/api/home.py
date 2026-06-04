"""Home board summary — one scoped aggregate powering the Summary cards.

GET /api/home/summary returns the six Summary-card numbers in a single
round-trip. Everything is visibility scoped exactly like the inventory list
(admin: all; manager: their cities; rm: rows assigned to them).

Shape:
  {
    leads:     { lead_new, lead_old, active_new, active_old },
    qualified: { new, old },
    follow_up: { new, old },
    visit:     { completed, to_be_completed, overdue },
    supply:    { pipeline, token_to_ama, onboarded, rejected_post_visit, cancelled_post_token },
    rejected:  { total, by_reason: { <reason>: n } },
    todays_task: { leads: { total, worked }, active: { total, worked } },
  }

  "new" = the row ENTERED that stage today (IST), read from activity_log; "old"
  = currently in that stage but entered earlier. For the intake 'lead' stage,
  "new" = created today (a lead enters at creation); 'lead' folds the legacy
  'unqualified'. visit.completed = rows now in any Supply Closure Tracker stage
  (a completed visit progresses there); to_be_completed / overdue come from the
  property-DB scheduled visit date for stage='visit_scheduled' rows.
"""
from __future__ import annotations

from flask import Blueprint, g, jsonify

from ..db import get_conn
from .auth import require_auth
from .inventory._common import _scope_clause, overdue_visit_ids

# Morning-cohort task progress. For a given stage, count the rows that were in
# that stage at the START of today (IST) and how many have since moved out
# ("worked"). The morning stage is reconstructed from activity_log — no daily
# snapshot/cron needed: it's the after_value of the latest stage_change before
# today; else the before_value of the earliest stage_change today (the stage the
# row sat in this morning before its first move); else the current stage (never
# changed). Only rows that existed before today can have a morning stage.

bp = Blueprint("home", __name__, url_prefix="/api/home")

# IST calendar today; created_at is TIMESTAMPTZ so convert to IST first.
_TODAY_IST = "(NOW() AT TIME ZONE 'Asia/Kolkata')::DATE"
_CREATED_IST = "(created_at AT TIME ZONE 'Asia/Kolkata')::DATE"

# A row counts as "qualified today" when its stage was moved to 'qualified' on
# today's IST date — read from activity_log, NOT from created_at (which is when
# the listing was ingested). Matches the Leads page "NEW" badge logic. Uses
# idx_activity_log_entity. Correlates on the un-aliased `inventory` table.
# Stage transitions are logged with action 'stage_change' (single-row PATCH +
# visit-schedule) or 'bulk_stage_change' (the bulk action bar). Both must be
# matched or bulk moves go uncounted.
_STAGE_CHANGE_ACTIONS = "('stage_change', 'bulk_stage_change')"


def _entered_today(stage: str) -> str:
    """SQL boolean: this inventory row's stage was changed INTO `stage` today
    (IST), per activity_log. Drives the "new vs old" split on the summary cards
    and the NEW badges. `stage` comes from a fixed set, never user input."""
    return (
        "EXISTS (SELECT 1 FROM activity_log al "
        "WHERE al.entity_type = 'inventory' AND al.entity_id = inventory.oh_id "
        f"AND al.action IN {_STAGE_CHANGE_ACTIONS} AND al.after_value = '{stage}' "
        f"AND (al.created_at AT TIME ZONE 'Asia/Kolkata')::DATE = {_TODAY_IST})"
    )


_QUALIFIED_TODAY = _entered_today("qualified")
_ACTIVE_TODAY = _entered_today("active")
_FOLLOW_UP_TODAY = _entered_today("follow_up")


def _visit_buckets(user) -> tuple[int, int]:
    """(to_be_completed, overdue) for rows currently in stage='visit_scheduled',
    bucketed by the property-DB scheduled visit date (see overdue_visit_ids).

    Overdue = scheduled date earlier than today (IST). Everything else still
    scheduled (today/future, or no date row yet) counts as "to be completed".
    The property read is guarded inside overdue_visit_ids, so a failure just
    yields overdue=0 rather than breaking the summary.
    """
    scope, scope_params = _scope_clause(user)
    conn = get_conn()
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                f"SELECT oh_id FROM inventory WHERE stage = 'visit_scheduled' {scope}",
                scope_params,
            )
            oh_ids = [r["oh_id"] for r in cur.fetchall()]
    finally:
        conn.close()

    if not oh_ids:
        return (0, 0)
    overdue = len(overdue_visit_ids(oh_ids))
    return (len(oh_ids) - overdue, overdue)


@bp.get("/summary")
@require_auth()
def summary():
    scope, scope_params = _scope_clause(g.user)
    where = f"WHERE TRUE {scope}"

    conn = get_conn()
    try:
        with conn, conn.cursor() as cur:
            # All summary-card counts in one conditional-aggregation pass.
            # "new" = entered the stage today (IST); for the intake 'lead' stage
            # that's created-today. 'lead' folds the legacy 'unqualified'.
            cur.execute(
                f"""
                SELECT
                  COUNT(*) FILTER (WHERE stage IN ('lead', 'unqualified') AND {_CREATED_IST} = {_TODAY_IST}) AS lead_new,
                  COUNT(*) FILTER (WHERE stage IN ('lead', 'unqualified') AND {_CREATED_IST} < {_TODAY_IST}) AS lead_old,
                  COUNT(*) FILTER (WHERE stage = 'active' AND {_ACTIVE_TODAY}) AS active_new,
                  COUNT(*) FILTER (WHERE stage = 'active' AND NOT {_ACTIVE_TODAY}) AS active_old,
                  COUNT(*) FILTER (WHERE stage = 'qualified' AND {_QUALIFIED_TODAY}) AS qualified_new,
                  COUNT(*) FILTER (WHERE stage = 'qualified' AND NOT {_QUALIFIED_TODAY}) AS qualified_old,
                  COUNT(*) FILTER (WHERE stage = 'follow_up' AND {_FOLLOW_UP_TODAY}) AS follow_up_new,
                  COUNT(*) FILTER (WHERE stage = 'follow_up' AND NOT {_FOLLOW_UP_TODAY}) AS follow_up_old,

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

            # Today's Task — morning cohort + how many have been worked. 'lead'
            # folds the legacy 'unqualified' alias.
            scope_i, scope_i_params = _scope_clause(g.user, alias="i")
            cur.execute(
                f"""
                SELECT
                  COUNT(*) FILTER (WHERE ms_norm = 'lead')                           AS lead_total,
                  COUNT(*) FILTER (WHERE ms_norm = 'lead'   AND cs_norm <> 'lead')   AS lead_worked,
                  COUNT(*) FILTER (WHERE ms_norm = 'active')                         AS active_total,
                  COUNT(*) FILTER (WHERE ms_norm = 'active' AND cs_norm <> 'active') AS active_worked
                FROM (
                  SELECT
                    CASE WHEN i.stage IN ('lead','unqualified') THEN 'lead' ELSE i.stage END   AS cs_norm,
                    CASE WHEN m.ms_raw IN ('lead','unqualified') THEN 'lead' ELSE m.ms_raw END AS ms_norm
                  FROM inventory i
                  CROSS JOIN LATERAL (
                    SELECT COALESCE(
                      (SELECT al.after_value FROM activity_log al
                         WHERE al.entity_type = 'inventory' AND al.entity_id = i.oh_id
                           AND al.action IN {_STAGE_CHANGE_ACTIONS}
                           AND (al.created_at AT TIME ZONE 'Asia/Kolkata')::DATE < {_TODAY_IST}
                         ORDER BY al.created_at DESC LIMIT 1),
                      (SELECT al.before_value FROM activity_log al
                         WHERE al.entity_type = 'inventory' AND al.entity_id = i.oh_id
                           AND al.action IN {_STAGE_CHANGE_ACTIONS}
                           AND (al.created_at AT TIME ZONE 'Asia/Kolkata')::DATE = {_TODAY_IST}
                         ORDER BY al.created_at ASC LIMIT 1),
                      i.stage
                    ) AS ms_raw
                  ) m
                  WHERE TRUE {scope_i}
                    AND (i.created_at AT TIME ZONE 'Asia/Kolkata')::DATE < {_TODAY_IST}
                ) sub
                """,
                scope_i_params,
            )
            task = cur.fetchone()

        supply = {
            "pipeline": row["sup_pipeline"],
            "token_to_ama": row["sup_token_to_ama"],
            "onboarded": row["sup_onboarded"],
            "rejected_post_visit": row["sup_rejected_post_visit"],
            "cancelled_post_token": row["sup_cancelled_post_token"],
        }
        # A completed visit progresses into the Supply Closure Tracker, so
        # "visits completed" = everything currently in those supply stages.
        visit_completed = sum(supply.values())
        visit_to_be_completed, visit_overdue = _visit_buckets(g.user)

        return jsonify({
            "leads": {
                "lead_new": row["lead_new"],
                "lead_old": row["lead_old"],
                "active_new": row["active_new"],
                "active_old": row["active_old"],
            },
            "qualified": {"new": row["qualified_new"], "old": row["qualified_old"]},
            "follow_up": {"new": row["follow_up_new"], "old": row["follow_up_old"]},
            "visit": {
                "completed": visit_completed,
                "to_be_completed": visit_to_be_completed,
                "overdue": visit_overdue,
            },
            "supply": supply,
            "rejected": {"total": row["rejected_total"], "by_reason": by_reason},
            "todays_task": {
                "leads": {"total": task["lead_total"], "worked": task["lead_worked"]},
                "active": {"total": task["active_total"], "worked": task["active_worked"]},
            },
        })
    finally:
        conn.close()
