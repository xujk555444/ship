from __future__ import annotations

import json
import re
import sys
from dataclasses import asdict, dataclass
from datetime import date, timedelta
from pathlib import Path


COMPANY = "广东粤电云河发电有限公司"
CARRIER = "广东省新能航运有限公司/船管公司"
TONNAGE_REMINDER_THRESHOLD = 80000


@dataclass
class ShipmentState:
    big_ship_no: str = ""
    flow: str = ""
    current_total: int = 0


@dataclass
class ParsedShipment:
    ship_no: str
    amount: int
    phone: str = ""
    flow: str = ""
    schedule: str = ""


def generate_shipment(raw_text: str, state: ShipmentState) -> tuple[ParsedShipment, str, int]:
    if not state.big_ship_no:
        raise ValueError("请先填写大船号。")
    if not state.flow:
        raise ValueError("请先在当前状态中填写流向。")

    parsed = parse_message(raw_text)
    output, new_total = build_output(parsed, state)
    return parsed, output, new_total


def get_state_file() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().with_name("shipment_state.json")
    return Path(__file__).with_name("shipment_state.json")


def load_state() -> ShipmentState:
    state_file = get_state_file()
    if not state_file.exists():
        return ShipmentState()

    try:
        data = json.loads(state_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return ShipmentState()

    return ShipmentState(
        big_ship_no=str(data.get("big_ship_no", "")).strip(),
        flow=str(data.get("flow", "")).strip(),
        current_total=_to_int(data.get("current_total", 0)),
    )


def save_state(state: ShipmentState) -> None:
    get_state_file().write_text(
        json.dumps(asdict(state), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def reset_state() -> ShipmentState:
    state = ShipmentState()
    save_state(state)
    return state


def complete_current_run() -> ShipmentState:
    return reset_state()


def parse_message(raw_text: str) -> ParsedShipment:
    text = _normalize_text(raw_text)
    return ParsedShipment(
        ship_no=_extract_ship_no(text),
        amount=_extract_amount(text),
        phone=_extract_phone(text),
        flow="",
        schedule=_extract_schedule(text),
    )


def build_output(parsed: ParsedShipment, state: ShipmentState) -> tuple[str, int]:
    new_total = parsed.amount if state.current_total <= 0 else state.current_total + parsed.amount
    lines = [
        f"委托公司：{COMPANY}",
        f"承运公司:{CARRIER}",
        f"大船号:{state.big_ship_no}",
        f"船号:{parsed.ship_no}",
        f"报装{parsed.amount}吨",
        f"累积{new_total}吨",
        f"电话{parsed.phone}",
        f"船期：{parsed.schedule}",
        f"流向：{state.flow}",
    ]
    return "\n".join(lines), new_total


def update_state_after_generation(state: ShipmentState, parsed: ParsedShipment, new_total: int) -> ShipmentState:
    state.current_total = new_total
    return state


def _normalize_text(text: str) -> str:
    normalized = text.replace("\u2005", " ").replace("\xa0", " ")
    normalized = normalized.replace("，", " ").replace("。", " ").replace(",", " ")
    return normalized.strip()


def _extract_ship_no(text: str) -> str:
    at_match = re.search(r"@([^\s,，。]+)", text)
    if at_match:
        return _normalize_ship_no(at_match.group(1).strip())

    label_match = re.search(r"(?:船号|船名)[:：]?\s*([^\r\n]+)", text)
    if label_match:
        return _normalize_ship_no(label_match.group(1).strip())

    lines = [line.strip(" ：:") for line in text.splitlines() if line.strip()]
    if not lines:
        raise ValueError("未识别到船号，请检查原始信息。")

    first_line = re.sub(r"^(?:船号|船名)[:：]?", "", lines[0]).strip()
    if not first_line:
        raise ValueError("未识别到船号，请检查原始信息。")
    return _normalize_ship_no(first_line)


def _extract_amount(text: str) -> int:
    amount_match = re.search(r"(?:报装|计划装|装煤|装)[:：]?\s*(\d+)\s*吨?", text)
    if not amount_match:
        raise ValueError("未识别到报装吨数，请检查原始信息。")
    return int(amount_match.group(1))


def _extract_phone(text: str) -> str:
    labeled_match = re.search(r"电话[:：]?\s*(1\d{10})", text)
    if labeled_match:
        return labeled_match.group(1)

    standalone_match = re.search(r"(?<!\d)(1\d{10})(?!\d)", text)
    return standalone_match.group(1) if standalone_match else ""


def _extract_schedule(text: str) -> str:
    today = date.today()

    explicit_match = re.search(r"船期[:：]?\s*(\d{1,2})月(\d{1,2})日", text)
    if explicit_match:
        return f"{int(explicit_match.group(1))}月{int(explicit_match.group(2))}日"

    day_only_match = re.search(r"船期[:：]?\s*(\d{1,2})号", text)
    if day_only_match:
        return f"{today.month}月{int(day_only_match.group(1))}日"

    if "吉船" in text:
        return _format_day(today)

    if "@" in text and "装煤" in text:
        return _format_day(today + timedelta(days=1))

    return ""


def _format_day(day: date) -> str:
    return f"{day.month}月{day.day}日"


def _to_int(value: object) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _normalize_ship_no(value: str) -> str:
    ship_no = value.strip()
    if re.fullmatch(r"[\u4e00-\u9fffA-Za-z]+[0-9]+船", ship_no):
        return ship_no[:-1]
    return ship_no
