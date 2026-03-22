from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from shipment_tool import ShipmentState, complete_current_run, generate_shipment, update_state_after_generation


BASE_DIR = Path(__file__).resolve().parent
PWA_DIR = BASE_DIR / "pwa"
STATIC_DIR = PWA_DIR / "static"

app = FastAPI(title="Shipment Message Tool Web")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class GenerateStatePayload(BaseModel):
    big_ship_no: str = ""
    flow: str = ""
    current_total: int = 0


class GenerateRequest(BaseModel):
    raw_text: str
    state: GenerateStatePayload


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/generate")
def generate(request: GenerateRequest) -> dict[str, object]:
    state = ShipmentState(
        big_ship_no=request.state.big_ship_no.strip(),
        flow=request.state.flow.strip(),
        current_total=request.state.current_total,
    )
    raw_text = request.raw_text.strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="请先粘贴原始报装信息。")

    try:
        parsed, output, new_total = generate_shipment(raw_text, state)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    updated_state = update_state_after_generation(state, parsed, new_total)
    reminder_required = new_total > 80000
    return {
        "output": output,
        "new_total": new_total,
        "reminder_required": reminder_required,
        "parsed": {
            "ship_no": parsed.ship_no,
            "amount": parsed.amount,
            "phone": parsed.phone,
            "flow": parsed.flow,
            "schedule": parsed.schedule,
        },
        "state": {
            "big_ship_no": updated_state.big_ship_no,
            "flow": updated_state.flow,
            "current_total": updated_state.current_total,
        },
    }


@app.post("/api/reset-state")
def reset_state() -> dict[str, object]:
    state = complete_current_run()
    return {
        "state": {
            "big_ship_no": state.big_ship_no,
            "flow": state.flow,
            "current_total": state.current_total,
        }
    }


@app.get("/")
def index() -> FileResponse:
    return FileResponse(PWA_DIR / "index.html")


@app.get("/manifest.webmanifest")
def manifest() -> FileResponse:
    return FileResponse(PWA_DIR / "manifest.webmanifest", media_type="application/manifest+json")


@app.get("/service-worker.js")
def service_worker() -> FileResponse:
    return FileResponse(PWA_DIR / "service-worker.js", media_type="application/javascript")


@app.get("/icon.svg")
def icon() -> FileResponse:
    return FileResponse(PWA_DIR / "icon.svg", media_type="image/svg+xml")
