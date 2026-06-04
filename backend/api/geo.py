"""Geo data for the My Profile coverage map.

Serves society coordinates from the bundled JSON so the map can plot exact
markers with no geocoding API. Each entry is {name, city, lat, lng}; the
frontend keys by name|city (with a name-only fallback) so same-named societies
in different cities don't collide.
"""
from __future__ import annotations

import json
import logging
import os

from flask import Blueprint, jsonify

from .auth import require_auth

bp = Blueprint("geo", __name__, url_prefix="/api/geo")
log = logging.getLogger(__name__)

_SOC_COORDS: list | None = None
_SOC_COORDS_PATH = os.path.join(os.path.dirname(__file__), "..", "migrations", "socities_coords.json")


def _load_society_coords() -> list:
    global _SOC_COORDS
    if _SOC_COORDS is not None:
        return _SOC_COORDS
    out: list = []
    try:
        with open(_SOC_COORDS_PATH, encoding="utf-8") as fh:
            for r in json.load(fh):
                name = (r.get("society_name") or "").strip()
                lat, lng = r.get("latitude"), r.get("longitude")
                if name and lat is not None and lng is not None:
                    out.append({"name": name, "city": (r.get("city") or None), "lat": lat, "lng": lng})
    except Exception as e:  # missing/bad file — map just won't have pins
        log.warning("society coords load failed (%s): %s", _SOC_COORDS_PATH, e)

    # Surface duplicate names that lack a city — those collide in the name-only
    # fallback (one silently wins). Add a "city" to each so name|city resolves.
    by_name: dict[str, list] = {}
    for e in out:
        by_name.setdefault(e["name"].strip().lower(), []).append(e)
    unresolved = [n for n, es in by_name.items() if len(es) > 1 and any(not e["city"] for e in es)]
    if unresolved:
        log.warning(
            "society coords: %d duplicate name(s) without a city (will collide): %s",
            len(unresolved), ", ".join(sorted(unresolved)),
        )

    _SOC_COORDS = out
    return out


@bp.get("/society-coords")
@require_auth()
def society_coords():
    """Society coordinates for the profile coverage map: [{name, city, lat, lng}]."""
    items = _load_society_coords()
    return jsonify({"items": items, "count": len(items)})
