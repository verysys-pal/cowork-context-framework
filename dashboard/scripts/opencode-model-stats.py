#!/usr/bin/env python3
"""Watch `opencode stats --models` output and print model usage changes.

Features:
- all-model watch by default
- exact / contains / regex matching when you want narrowing
- cache snapshots keyed by the active model selection
- optional watch mode that prints only changed models
- table output with current / three previous values
- built-in default pattern list that users can edit directly in code if desired

Examples:
  scripts/opencode-model-stats.py
  scripts/opencode-model-stats.py --contains gemma4
  scripts/opencode-model-stats.py --watch --interval 15
  # edit DEFAULT_MODEL_PATTERNS in this file to pre-filter if desired
"""

from __future__ import annotations

import argparse
import colorsys
import contextlib
import hashlib
import json
import os
import re
import select
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator
import termios
import tty

ANSI_RESET = "\033[0m"

DEFAULT_MODEL_PATTERNS: list[str] = []

METRIC_LABELS = (
    "Messages",
    "Input Tokens",
    "Output Tokens",
    "Cache Read",
    "Cache Write",
    "Cost",
)

TABLE_HEADERS = ("Label", "Now", "VAL-1", "VAL-2", "VAL-3")
HISTORY_DEPTH = 4
PREVIOUS_VALUE_COUNT = 3


@dataclass(frozen=True)
class ModelBlock:
    name: str
    metrics: list[tuple[str, str]]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Watch `opencode stats --models` and print model usage updates.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "patterns",
        nargs="*",
        help=(
            "Model names or match patterns. "
            "If omitted, all models from `opencode stats --models` are shown."
        ),
    )
    match_group = parser.add_mutually_exclusive_group()
    match_group.add_argument(
        "--exact",
        action="store_true",
        help="Match model names exactly. This is the default.",
    )
    match_group.add_argument(
        "--contains",
        action="store_true",
        help="Match if the pattern is contained in the model name.",
    )
    match_group.add_argument(
        "--regex",
        action="store_true",
        help="Match using regular expressions.",
    )
    parser.add_argument(
        "--watch",
        action="store_true",
        help="Keep polling and print only the models whose usage changed.",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=10.0,
        help="Polling interval in seconds for --watch (default: 10).",
    )
    parser.add_argument(
        "--cache-dir",
        default=os.environ.get(
            "OPENCODE_MODEL_STATS_CACHE_DIR",
            str(Path(os.environ.get("XDG_CACHE_HOME", Path.home() / ".cache")) / "opencode-model-stats"),
        ),
        help="Cache directory for rendered snapshots.",
    )
    parser.add_argument(
        "--no-cache",
        action="store_true",
        help="Disable cache writes.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Rewrite the cache even if the fingerprint did not change.",
    )
    return parser.parse_args()


def load_default_patterns() -> list[str]:
    return list(DEFAULT_MODEL_PATTERNS)


def normalize_patterns(patterns: Iterable[str]) -> list[str]:
    return [pattern.strip() for pattern in patterns if pattern and pattern.strip()]


def clean_box_line(line: str) -> str:
    return re.sub(r"^│\s*|\s*│$", "", line)


def parse_metric(content: str) -> tuple[str, str] | None:
    for label in METRIC_LABELS:
        if content.startswith(label):
            value = content[len(label) :].strip()
            return label, value
    return None


def extract_model_blocks(text: str) -> list[ModelBlock]:
    blocks: list[ModelBlock] = []
    in_model_section = False
    awaiting_model = False
    current_name: str | None = None
    current_metrics: list[tuple[str, str]] = []

    for line in text.splitlines():
        if not in_model_section:
            if "MODEL USAGE" in line:
                in_model_section = True
                awaiting_model = False
            continue

        if line.startswith("└"):
            if current_name is not None:
                blocks.append(ModelBlock(current_name, current_metrics))
            break

        if line.startswith("├") or line.startswith("┌"):
            if current_name is not None:
                blocks.append(ModelBlock(current_name, current_metrics))
                current_name = None
                current_metrics = []
            awaiting_model = True
            continue

        if not line.startswith("│"):
            continue

        content = clean_box_line(line)
        if not content:
            continue

        if awaiting_model:
            current_name = content
            current_metrics = []
            awaiting_model = False
            continue

        if current_name is None:
            continue

        metric = parse_metric(content)
        if metric is not None:
            current_metrics.append(metric)

    return blocks


def matches(name: str, patterns: list[str], mode: str) -> bool:
    if mode == "exact":
        return any(name == pattern for pattern in patterns)
    if mode == "contains":
        return any(pattern in name for pattern in patterns)
    if mode == "regex":
        return any(re.search(pattern, name) is not None for pattern in patterns)
    raise ValueError(f"Unsupported match mode: {mode}")


def filter_blocks(blocks: list[ModelBlock], patterns: list[str], mode: str) -> list[ModelBlock]:
    if not patterns:
        return blocks
    return [block for block in blocks if matches(block.name, patterns, mode)]


def block_metric_map(block: ModelBlock) -> dict[str, str]:
    return {label: value for label, value in block.metrics}


def snapshot_models(blocks: list[ModelBlock]) -> dict[str, dict[str, str]]:
    return {block.name: block_metric_map(block) for block in blocks}


def snapshot_order(blocks: list[ModelBlock]) -> list[str]:
    return [block.name for block in blocks]


def snapshot_from_blocks(blocks: list[ModelBlock]) -> dict[str, object]:
    return {
        "captured_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "order": snapshot_order(blocks),
        "models": snapshot_models(blocks),
    }


def recent_snapshots(history: list[dict[str, object]]) -> list[dict[str, object] | None]:
    snapshots: list[dict[str, object] | None] = []
    for index in range(PREVIOUS_VALUE_COUNT):
        snapshots.append(history[-(index + 1)] if len(history) >= index + 1 else None)
    return snapshots


def snapshot_model_map(snapshot: dict[str, object] | None) -> dict[str, dict[str, str]]:
    if snapshot is None:
        return {}
    models = snapshot.get("models", {})
    if not isinstance(models, dict):
        return {}
    normalized: dict[str, dict[str, str]] = {}
    for name, metrics in models.items():
        if not isinstance(name, str) or not isinstance(metrics, dict):
            continue
        normalized[name] = {
            label: value for label, value in metrics.items() if isinstance(label, str) and isinstance(value, str)
        }
    return normalized


def snapshot_model_order(snapshot: dict[str, object] | None) -> list[str]:
    if snapshot is None:
        return []
    order = snapshot.get("order", [])
    if not isinstance(order, list):
        return []
    return [name for name in order if isinstance(name, str)]


def snapshot_fingerprint(metrics: dict[str, str]) -> str:
    payload = json.dumps(metrics, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def cache_key(patterns: list[str], mode: str) -> str:
    payload = json.dumps({"mode": mode, "patterns": patterns}, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def cache_path(cache_dir: Path, patterns: list[str], mode: str) -> Path:
    return cache_dir / f"{cache_key(patterns, mode)}.json"


def read_cache(path: Path) -> dict[str, object] | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def write_cache(path: Path, payload: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    tmp.replace(path)


def load_history(path: Path) -> list[dict[str, object]]:
    data = read_cache(path)
    if data is None:
        return []

    history = data.get("history")
    if isinstance(history, list):
        normalized: list[dict[str, object]] = []
        for item in history:
            if not isinstance(item, dict):
                continue
            order = item.get("order", [])
            models = item.get("models", {})
            if not isinstance(order, list) or not isinstance(models, dict):
                continue
            normalized.append(
                {
                    "captured_at": item.get("captured_at"),
                    "order": [name for name in order if isinstance(name, str)],
                    "models": {
                        name: {k: v for k, v in metrics.items() if isinstance(k, str) and isinstance(v, str)}
                        for name, metrics in models.items()
                        if isinstance(name, str) and isinstance(metrics, dict)
                    },
                }
            )
        return normalized

    entries = data.get("entries")
    if isinstance(entries, list) and entries:
        # Legacy cache format from earlier versions.
        return [
            {
                "captured_at": data.get("updated_at"),
                "order": [entry.get("name") for entry in entries if isinstance(entry, dict) and isinstance(entry.get("name"), str)],
                "models": {},
            }
        ]

    return []


def build_history_payload(history: list[dict[str, object]], patterns: list[str], mode: str) -> dict[str, object]:
    return {
        "updated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "patterns": patterns,
        "match_mode": mode,
        "history": history[-HISTORY_DEPTH:],
    }


def append_history(history: list[dict[str, object]], snapshot: dict[str, object]) -> list[dict[str, object]]:
    return (history + [snapshot])[-HISTORY_DEPTH:]


def run_stats_command() -> str:
    if shutil_which("opencode") is None:
        raise SystemExit("opencode command not found")

    proc = subprocess.run(
        ["opencode", "stats", "--models"],
        check=False,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        if proc.stderr:
            sys.stderr.write(proc.stderr)
        raise SystemExit(proc.returncode)
    return proc.stdout


def shutil_which(command: str) -> str | None:
    from shutil import which

    return which(command)


def selected_mode(args: argparse.Namespace) -> str:
    if args.contains:
        return "contains"
    if args.regex:
        return "regex"
    return "exact"


def resolve_patterns(args: argparse.Namespace) -> list[str]:
    patterns = normalize_patterns(args.patterns)
    if patterns:
        return patterns
    return load_default_patterns()


def supports_color() -> bool:
    return sys.stdout.isatty() and os.environ.get("NO_COLOR") is None


def colorize(text: str, color_code: str) -> str:
    if not supports_color():
        return text
    return f"{color_code}{text}{ANSI_RESET}"


def model_color_code(name: str) -> str:
    digest = hashlib.sha256(name.encode("utf-8")).digest()
    hue = 0.56 + (digest[0] / 255.0) * 0.12
    lightness = 0.42 + (digest[1] / 255.0) * 0.18
    saturation = 0.62 + (digest[2] / 255.0) * 0.24
    red, green, blue = colorsys.hls_to_rgb(hue % 1.0, lightness, saturation)
    return f"\033[38;2;{int(red * 255)};{int(green * 255)};{int(blue * 255)}m"


@contextlib.contextmanager
def interactive_input_mode() -> Iterator[None]:
    if not sys.stdin.isatty():
        yield
        return

    fd = sys.stdin.fileno()
    original = termios.tcgetattr(fd)
    try:
        tty.setcbreak(fd)
        yield
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, original)


def parse_metric_value(value: str) -> float | None:
    normalized = value.strip().replace(",", "")
    if not normalized or normalized == "-":
        return None
    if normalized.startswith("$"):
        normalized = normalized[1:]
    match = re.fullmatch(r"([0-9]+(?:\.[0-9]+)?)([KMB])?", normalized, flags=re.IGNORECASE)
    if match is None:
        try:
            return float(normalized)
        except ValueError:
            return None

    magnitude = float(match.group(1))
    suffix = (match.group(2) or "").upper()
    multiplier = {
        "": 1.0,
        "K": 1_000.0,
        "M": 1_000_000.0,
        "B": 1_000_000_000.0,
    }.get(suffix, 1.0)
    return magnitude * multiplier


def format_metric_value(label: str, value: float) -> str:
    if label == "Cost":
        return f"${value:.4f}"
    absolute = abs(value)
    if absolute >= 1_000_000_000:
        return f"{value / 1_000_000_000:.1f}B"
    if absolute >= 1_000_000:
        return f"{value / 1_000_000:.1f}M"
    if absolute >= 1_000:
        return f"{value / 1_000:.1f}K"
    if value.is_integer():
        return f"{int(value):,}"
    return f"{value:.2f}"


def render_summary_table(snapshot: dict[str, object]) -> str:
    model_map = snapshot_model_map(snapshot)
    model_count = len(model_map)
    totals: dict[str, float] = {label: 0.0 for label in METRIC_LABELS}
    present: dict[str, bool] = {label: False for label in METRIC_LABELS}

    for metrics in model_map.values():
        for label in METRIC_LABELS:
            parsed = parse_metric_value(metrics.get(label, ""))
            if parsed is None:
                continue
            totals[label] += parsed
            present[label] = True

    rows = [["Models", str(model_count)]]
    for label in METRIC_LABELS:
        if present[label]:
            rows.append([label, format_metric_value(label, totals[label])])

    widths = [len("Total"), len("Now")]
    for row in rows:
        widths[0] = max(widths[0], len(row[0]))
        widths[1] = max(widths[1], len(row[1]))

    lines = [
        "q pressed, stopping monitoring and showing totals.",
        "| " + " | ".join(["Total".ljust(widths[0]), "Now".ljust(widths[1])]) + " |",
        "|-" + "-|-".join("-" * width for width in widths) + "-|",
    ]
    lines.extend(
        f"| {row[0].ljust(widths[0])} | {row[1].ljust(widths[1])} |"
        for row in rows
    )
    return "\n".join(lines)


def wait_for_quit(timeout: float) -> bool:
    if not sys.stdin.isatty():
        time.sleep(timeout)
        return False

    readable, _, _ = select.select([sys.stdin], [], [], timeout)
    if not readable:
        return False

    chunk = sys.stdin.read(1)
    return chunk.lower() == "q" if chunk else False


def render_table_row(cells: list[str], widths: list[int]) -> str:
    return "| " + " | ".join(cells[index].ljust(widths[index]) for index in range(len(cells))) + " |"


def render_metric_table(
    current: dict[str, str],
    previous_snapshots: list[dict[str, str] | None] | None = None,
) -> str:
    previous_snapshots = previous_snapshots or [None, None, None]
    if len(previous_snapshots) < PREVIOUS_VALUE_COUNT:
        previous_snapshots = previous_snapshots + [None] * (PREVIOUS_VALUE_COUNT - len(previous_snapshots))
    rows = [
        [
            label,
            current.get(label, "-"),
            (previous_snapshots[0] or {}).get(label, "-"),
            (previous_snapshots[1] or {}).get(label, "-"),
            (previous_snapshots[2] or {}).get(label, "-"),
        ]
        for label in METRIC_LABELS
    ]
    widths = [len(header) for header in TABLE_HEADERS]
    for row in rows:
        for index, cell in enumerate(row):
            widths[index] = max(widths[index], len(cell))

    lines = [
        render_table_row(list(TABLE_HEADERS), widths),
        "|-" + "-|-".join("-" * width for width in widths) + "-|",
    ]
    lines.extend(render_table_row(row, widths) for row in rows)
    return "\n".join(lines)


def render_model_block(
    name: str,
    current: dict[str, str],
    previous_snapshots: list[dict[str, str] | None] | None = None,
) -> str:
    return "\n".join([colorize(name, model_color_code(name)), render_metric_table(current, previous_snapshots)])


def render_removed_model(name: str) -> str:
    return f"- {colorize(name, model_color_code(name))} | removed"


def render_snapshot(
    current_snapshot: dict[str, object],
    previous_snapshots: list[dict[str, object] | None],
    names: list[str] | None = None,
) -> str:
    current_models = snapshot_model_map(current_snapshot)
    previous_models = [snapshot_model_map(snapshot) for snapshot in previous_snapshots]
    current_order = snapshot_model_order(current_snapshot)
    lines: list[str] = []

    wanted = set(names) if names is not None else set(current_order)
    for name in current_order:
        if name not in wanted:
            continue
        lines.append(
            render_model_block(
                name,
                current_models.get(name, {}),
                [model_map.get(name) for model_map in previous_models],
            )
        )
        lines.append("")

    if names is not None and previous_snapshots and previous_snapshots[0] is not None:
        previous_order = snapshot_model_order(previous_snapshots[0])
        for name in previous_order:
            if name in wanted and name not in current_models:
                lines.append(render_removed_model(name))

    return "\n".join(lines).rstrip()


def changed_model_names(
    current_snapshot: dict[str, object],
    previous_snapshot: dict[str, object] | None,
) -> list[str]:
    current_models = snapshot_model_map(current_snapshot)
    current_order = snapshot_model_order(current_snapshot)
    previous_models = snapshot_model_map(previous_snapshot)
    previous_order = snapshot_model_order(previous_snapshot)
    changed: list[str] = []

    for name in current_order:
        current_fp = snapshot_fingerprint(current_models.get(name, {}))
        previous_metrics = previous_models.get(name)
        previous_fp = snapshot_fingerprint(previous_metrics) if previous_metrics is not None else None
        if current_fp != previous_fp:
            changed.append(name)

    for name in previous_order:
        if name not in current_models:
            changed.append(name)

    return changed


def emit_once(args: argparse.Namespace, patterns: list[str], mode: str) -> int:
    text = run_stats_command()
    blocks = filter_blocks(extract_model_blocks(text), patterns, mode)
    current_snapshot = snapshot_from_blocks(blocks)
    cache_file = cache_path(Path(args.cache_dir), patterns, mode)
    history = load_history(cache_file)
    previous_snapshots = recent_snapshots(history)
    rendered = render_snapshot(current_snapshot, previous_snapshots)

    if not rendered:
        sys.stderr.write(
            "No matching model blocks found. "
            "Check the model names or use --contains/--regex.\n"
        )
        return 1

    if not args.no_cache:
        updated_history = append_history(history, current_snapshot)
        write_cache(cache_file, build_history_payload(updated_history, patterns, mode))

    sys.stdout.write(rendered)
    sys.stdout.write("\n")
    return 0


def emit_watch(args: argparse.Namespace, patterns: list[str], mode: str) -> int:
    cache_file = cache_path(Path(args.cache_dir), patterns, mode)
    history = load_history(cache_file)

    if sys.stdin.isatty():
        sys.stderr.write("Press q to stop monitoring and show totals.\n")

    with interactive_input_mode():
        while True:
            text = run_stats_command()
            blocks = filter_blocks(extract_model_blocks(text), patterns, mode)
            current_snapshot = snapshot_from_blocks(blocks)

            if not snapshot_model_order(current_snapshot):
                sys.stderr.write(
                    "No matching model blocks found. "
                    "Check the model names or use --contains/regex.\n"
                )
                return 1

            previous_snapshots = recent_snapshots(history)
            changed = changed_model_names(current_snapshot, previous_snapshots[0])

            updated_history = append_history(history, current_snapshot)
            if not args.no_cache:
                write_cache(cache_file, build_history_payload(updated_history, patterns, mode))
            history = updated_history

            if changed:
                rendered = render_snapshot(current_snapshot, previous_snapshots, names=changed)
                if rendered:
                    sys.stdout.write(rendered)
                    sys.stdout.write("\n")
                    sys.stdout.flush()

            if wait_for_quit(max(args.interval, 0.1)):
                summary = render_summary_table(current_snapshot)
                sys.stdout.write(summary)
                sys.stdout.write("\n")
                sys.stdout.flush()
                return 0


def main() -> int:
    args = parse_args()
    patterns = resolve_patterns(args)
    mode = selected_mode(args)
    if args.watch:
        return emit_watch(args, patterns, mode)
    return emit_once(args, patterns, mode)


if __name__ == "__main__":
    raise SystemExit(main())
