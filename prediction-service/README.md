# Prediction Service

Standalone FastAPI service for football prediction workflow.

## What this service owns

- `GET /health`
- `GET /pipeline/status`
- `POST /pipeline/upload`
- `POST /pipeline/full`
- `POST /predict`
- `POST /predict-match` (legacy alias)
- `POST /predictions/export-fixtures`
- `GET /predictions/download/{filename}`
- `DELETE /pipeline/files/{filename}`

This service is intended to be the single source of truth for prediction output used by the React admin.

## Local run

1. Create a virtual environment.
2. Install dependencies.
3. Copy `.env.example` to `.env` and adjust paths if needed.
4. Run the API.

```bash
cd prediction-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open:

```txt
http://127.0.0.1:8000/health
http://127.0.0.1:8000/docs
```

## Data layout

The service reads and writes these directories:

- `data/raw`
  Season archive CSV files uploaded through `/pipeline/upload`
- `data/predictions`
  Exported prediction CSV files for download
- `data/models`
  Reserved for future model artifacts if training output needs persistence

If `PREDICTION_DATA_DIR` is not set:

- it prefers the shared repo `../data` when present
- otherwise it falls back to `prediction-service/data`

## Persistent storage

Mount persistent storage for:

- `data/raw`
- `data/predictions`
- `data/models`

At minimum, `raw` and `predictions` must persist across deploys.

## Render deployment

Recommended:

- Runtime: `Python 3.11`
- Build Command:

```bash
pip install -r requirements.txt
```

- Start Command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

- Environment:
  - `CORS_ALLOWED_ORIGINS`
  - `PREDICTION_DATA_DIR`
  - `PREDICTION_RAW_DIR`
  - `PREDICTION_EXPORT_DIR`
  - `PREDICTION_MODEL_DIR`

Example mount path on Render disk:

```txt
/var/data/prediction-service
```

Then set:

```env
PREDICTION_DATA_DIR=/var/data/prediction-service
PREDICTION_RAW_DIR=/var/data/prediction-service/raw
PREDICTION_EXPORT_DIR=/var/data/prediction-service/predictions
PREDICTION_MODEL_DIR=/var/data/prediction-service/models
```

## Railway deployment

- Runtime: Python
- Install:

```bash
pip install -r requirements.txt
```

- Start:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Railway volume should be mounted to the same persistent `PREDICTION_DATA_DIR`.

## Frontend integration

Set the React admin base URL in the main project:

```env
NEXT_PUBLIC_epl_PREDICTION_API_BASE_URL=https://your-prediction-service-domain
```

Current frontend files that read this base URL:

- `app/admin/ai/admin-ai-client.ts`
- `app/api/worldcup-prediction/route.ts`

## Endpoint checks after deploy

Run these checks in order:

1. `GET /health`
2. `GET /pipeline/status`
3. `POST /pipeline/upload` with 1 CSV
4. `POST /pipeline/upload` with multiple CSV files
5. `POST /pipeline/full`
6. `POST /predict`
7. `POST /predictions/export-fixtures`
8. `GET /predictions/download/{filename}`

## Notes

- Prediction logic was kept aligned with the existing backend workflow instead of moving it into React/Node.
- `/predict-match` remains available as a compatibility alias during migration.
- If you later introduce real model training artifacts, store them under `data/models`.
