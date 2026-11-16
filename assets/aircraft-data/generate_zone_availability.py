#!/usr/bin/env python3
"""Derive Inspector zone availability from named components in each bundled GLB."""

import json
import re
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parent
COMPONENT_PATTERNS = {
    "window_panes": r"^Window (?:glass|glazing)\b",
    "ceiling_panels": r"^(?:Cabin )?Ceiling (?:panel|shell|lining)\b",
    "ceiling_coves": r"^Ceiling cove\b",
    "left_sidewall_lights": r"^Sidewall light -1$",
    "right_sidewall_lights": r"^Sidewall light 1$",
    "left_sidewall_fixture_meshes": r"^left sidewall fixture \d+$",
    "right_sidewall_fixture_meshes": r"^right sidewall fixture \d+$",
    "left_sidewall_fixture_anchors": r"^left sidewall fixture \d+$",
    "right_sidewall_fixture_anchors": r"^right sidewall fixture \d+$",
    "footwells": r"^Footwell (?:-1|1)$",
    "seat_headrests": r"\bseat\b.*\bheadrest\b",
    "reading_fixtures": r"^(?:Reading light|Reading lamp|Passenger service panel reading light)\b",
    "call_button_fixtures": r"^(?:Passenger )?(?:attendant )?call button\b|^Passenger service panel call button\b",
    "spotlight_fixtures": r"^(?:Spotlight|Spot light|Downlight)\b",
    "overhead_bins": r"^Overhead luggage bin\b",
    "bin_handles": r"^Bin door handle\b",
    "galley_modules": r"^Galley module$",
    "vip_side_consoles": r"^VIP side console\b",
    "entry_doors": r"^(?:Cabin )?Entry door\b",
    "lavatories": r"^(?:Lavatory|Toilet)\b",
    "trolleys": r"^Trolley\b",
    "emergency_fixtures": r"^(?:Emergency fixture|Escape path fixture)\b",
    "exit_signs": r"^Exit sign\b",
}


def read_node_records(path: Path) -> list[dict]:
    data = path.read_bytes()
    if data[:4] != b"glTF":
        raise ValueError(f"Not a GLB file: {path}")
    chunk_length = struct.unpack_from("<I", data, 12)[0]
    chunk_type = data[16:20]
    if chunk_type != b"JSON":
        raise ValueError(f"First GLB chunk is not JSON: {path}")
    document = json.loads(data[20 : 20 + chunk_length])
    return [node for node in document.get("nodes", []) if node.get("name")]


def read_node_names(path: Path) -> list[str]:
    return [node["name"].replace("_", " ") for node in read_node_records(path)]


def profile_record(profile_id: str, mesh_path: str) -> dict:
    nodes = read_node_records(ROOT / mesh_path)
    names = [node["name"].replace("_", " ") for node in nodes]
    counts = {
        key: sum(bool(re.search(pattern, name, re.IGNORECASE)) for name in names)
        for key, pattern in COMPONENT_PATTERNS.items()
    }
    # Empty transform nodes named "fixture" are locators, not modeled emitters.
    for key, pattern in (
        ("left_sidewall_fixture_meshes", COMPONENT_PATTERNS["left_sidewall_fixture_meshes"]),
        ("right_sidewall_fixture_meshes", COMPONENT_PATTERNS["right_sidewall_fixture_meshes"]),
    ):
        counts[key] = sum(
            "mesh" in node and bool(re.search(pattern, node["name"].replace("_", " "), re.IGNORECASE))
            for node in nodes
        )
    for key, pattern in (
        ("left_sidewall_fixture_anchors", COMPONENT_PATTERNS["left_sidewall_fixture_anchors"]),
        ("right_sidewall_fixture_anchors", COMPONENT_PATTERNS["right_sidewall_fixture_anchors"]),
    ):
        counts[key] = sum(
            "mesh" not in node and bool(re.search(pattern, node["name"].replace("_", " "), re.IGNORECASE))
            for node in nodes
        )
    zones = []
    fixtures = []

    def add(zone_id: str, name: str, basis: str) -> None:
        zones.append({"id": zone_id, "name": name, "basis": basis})

    if counts["window_panes"]:
        add("windows", "Window daylight", f'{counts["window_panes"]} named glass/glazing components')
    if counts["ceiling_panels"]:
        add("ceiling", "Ceiling wash", f'{counts["ceiling_panels"]} named ceiling panel/shell components')
    if counts["overhead_bins"]:
        add("handrail", "Handrail / bin edge", f'{counts["overhead_bins"]} overhead-bin components')
    elif counts["vip_side_consoles"]:
        add("handrail", "VIP console edge", f'{counts["vip_side_consoles"]} VIP side-console components')
    if counts["ceiling_coves"]:
        add("ceiling_cove", "Central ceiling recess", f'{counts["ceiling_coves"]} named ceiling-cove components')
    left_fixture_count = counts["left_sidewall_fixture_meshes"]
    right_fixture_count = counts["right_sidewall_fixture_meshes"]
    if left_fixture_count or counts["left_sidewall_lights"]:
        add("left_sidewall", "Left sidewall", f'{left_fixture_count} named fixture meshes; {counts["left_sidewall_lights"]} modeled left-sidewall light strip mesh')
    if right_fixture_count or counts["right_sidewall_lights"]:
        add("right_sidewall", "Right sidewall", f'{right_fixture_count} named fixture meshes; {counts["right_sidewall_lights"]} modeled right-sidewall light strip mesh')
    if counts["footwells"]:
        add("footwell", "Footwell", f'{counts["footwells"]} named footwell components')
    if counts["reading_fixtures"]:
        add("reading", "Reading lights", f'{counts["reading_fixtures"]} named reading-light fixtures')
    monument_count = counts["galley_modules"] + counts["vip_side_consoles"]
    if monument_count:
        add("monuments", "Service monuments / VIP consoles", f'{monument_count} named service-surface components')
    if counts["spotlight_fixtures"]:
        add("spotlights", "Spotlights", f'{counts["spotlight_fixtures"]} named spotlight fixtures')
    for key, zone_id, label in (
        ("entry_doors", "entry", "Entry"),
        ("lavatories", "toilet", "Lavatory"),
        ("trolleys", "trolley", "Trolley"),
        ("emergency_fixtures", "emergency", "Emergency lighting"),
        ("exit_signs", "exit", "Exit signs"),
    ):
        if counts[key]:
            add(zone_id, label, f'{counts[key]} named components')

    # Keep each explicitly named source/anchor separate. Empty sidewall nodes
    # are locator transforms only; their visual emitter is clearly labeled as
    # simulated and is not described as installed aircraft hardware.
    fixture_patterns = (
        ("left_sidewall", "locator", re.compile(r"^left sidewall fixture (\d+)$", re.IGNORECASE), "Left sidewall locator"),
        ("right_sidewall", "locator", re.compile(r"^right sidewall fixture (\d+)$", re.IGNORECASE), "Right sidewall locator"),
        ("left_sidewall", "mesh", re.compile(r"^sidewall light -1$", re.IGNORECASE), "Left sidewall light strip"),
        ("right_sidewall", "mesh", re.compile(r"^sidewall light 1$", re.IGNORECASE), "Right sidewall light strip"),
        ("ceiling_cove", "mesh", re.compile(r"^ceiling cove(?: -1| 1)$", re.IGNORECASE), "Ceiling recess segment"),
        ("reading", "mesh", re.compile(r"^(?:reading light|reading lamp|passenger service panel reading light)\b", re.IGNORECASE), "Reading light"),
    )
    for node_index, node in enumerate(nodes):
        actual_name = node["name"]
        normalized_name = actual_name.replace("_", " ")
        for parent_zone, expected_kind, pattern, label in fixture_patterns:
            match = pattern.search(normalized_name)
            if not match:
                continue
            has_mesh = "mesh" in node
            if (expected_kind == "mesh") != has_mesh:
                continue
            slug = re.sub(r"[^a-z0-9]+", "-", normalized_name.lower()).strip("-")
            qualifier = f" {match.group(1)}" if match.lastindex else f" · {actual_name}"
            basis = (
                f"Named GLB mesh node: {actual_name}"
                if has_mesh
                else f"Named GLB locator node: {actual_name}; authored transform, no fixture mesh"
            )
            fixtures.append({
                "id": f"fixture:{profile_id}:{parent_zone}:{slug}:node-{node_index}",
                "name": f"{label}{qualifier}",
                "parent_zone_id": parent_zone,
                "node_name": actual_name,
                "source_kind": "mesh" if has_mesh else "locator",
                "basis": basis,
            })
            break

    zones.extend({
        "id": fixture["id"],
        "name": fixture["name"],
        "basis": fixture["basis"],
        "parent_zone_id": fixture["parent_zone_id"],
        "source_node_name": fixture["node_name"],
        "source_kind": fixture["source_kind"],
    } for fixture in fixtures)

    return {
        "id": profile_id,
        "mesh_path": mesh_path,
        "component_counts": counts,
        "zones": zones,
        "fixtures": fixtures,
    }


def main() -> None:
    catalog = json.loads((ROOT / "catalog.json").read_text(encoding="utf-8"))
    airline_catalog = json.loads((ROOT / "airline-mesh-catalog.json").read_text(encoding="utf-8"))
    profiles = [profile_record(item["id"], item["mesh_path"]) for item in catalog["aircraft"]]
    profiles.extend(
        profile_record(item["id"], item["mesh_path"])
        for item in airline_catalog["profiles"]
    )
    result = {
        "schema_version": "1.0",
        "evidence": "Exact GLB node names read from the bundled mesh JSON chunks; generated simulated task fixtures are identified as simulated in each zone basis.",
        "profile_count": len(profiles),
        "profiles": profiles,
    }
    output = ROOT / "zone-availability.json"
    output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(profiles)} mesh profiles to {output}")


if __name__ == "__main__":
    main()

