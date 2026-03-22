# Render Deployment

This project contains:

- a Windows desktop tool based on `PySide6`
- a web/PWA version based on `FastAPI`

Render should only deploy the web/PWA version.

## Required files for Render

- `web_app.py`
- `shipment_tool.py`
- `pwa/`
- `requirements-web.txt`
- `render.yaml`

## Render settings

- Runtime: `Python`
- Build Command: `pip install -r requirements-web.txt`
- Start Command: `python -m uvicorn web_app:app --host 0.0.0.0 --port $PORT`

## Local run

```powershell
python -m uvicorn web_app:app --host 0.0.0.0 --port 8000
```

Then open:

```text
http://127.0.0.1:8000
```
