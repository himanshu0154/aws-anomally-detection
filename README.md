# SkyGuard AI — Intelligent AWS Anomaly Detection

AI/ML-based real-time anomaly detection system for Automatic Weather Stations (AWS). SkyGuard AI monitors temperature, humidity, and pressure sensors in real-time, using Isolation Forest models and per-sensor residual regressors to detect sensor anomalies and guide operators to corrective action.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    SkyGuard AI System                     │
├─────────────────┬───────────────────┬───────────────────┤
│   Frontend      │      API          │   ML Models       │
│   (Next.js)     │    (FastAPI)      │   (Python)        │
├─────────────────┼───────────────────┼───────────────────┤
│ • Dashboard UI  │ • REST Endpoints  │ • Isolation Forest│
│ • Real-time     │ • Live Simulator  │ • Residual Models │
│   Charts        │ • Anomaly Detect  │ • Rule-based      │
│ • Sensor Health │ • History API     │   Thresholds      │
└────────┬────────┴────────┬──────────┴────────┬──────────┘
         │                 │                   │
         └─────────────────┴───────────────────┘
                    HTTP Polling (4s)
```

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- npm or yarn

### 1. Install Python Dependencies

```bash
cd api
pip install -r requirements.txt
```

### 2. Start the Backend API

```bash
cd api
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will start at `http://localhost:8000` and begin simulating sensor data from historical CSV files.

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 4. Start the Frontend

```bash
cd frontend
npm run dev
```

The dashboard will be available at `http://localhost:4028`.

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `GET` | `/api/live` | Latest canonical sensor reading (current detection state) |
| `GET` | `/api/series?limit=40` | Time series for charts. Each point carries raw `pressure` (hPa) plus the legacy `pressureScaled` (÷10) view |
| `GET` | `/api/history?limit=50` | Persistent session event log, newest first (`limit` up to 500). Status is `Normal`, `Active` or `Resolved` |
| `POST` | `/api/history/{event_id}/resolve` | Operator resolution: sets `Resolved` + `resolved_at`. Idempotent; `400` for a normal reading, `404` for an unknown id |
| `POST` | `/detect` | Manual anomaly detection (shares the simulator's code path) |

### Anomaly lifecycle

Every processed reading becomes a persistent record, so an anomaly never disappears when the
next reading is normal:

```
normal reading       -> status Normal    (terminal)
anomaly detected     -> status Active    (stays Active until an operator resolves it)
POST .../resolve     -> status Resolved  (never Normal) + resolved_at
```

Current detection state (`/api/live`) and event lifecycle (`/api/history`) are deliberately
separate: a normal live reading never changes the status of a stored event. Event ids
(`hist-0001`, `hist-0002`, …) are monotonic and never reused, so they stay stable even after the
in-process store (5000 records) rolls over.

## 🎯 Features

### Real-Time Anomaly Detection
- **Temperature Spikes**: Sudden changes exceeding learned thresholds
- **Frozen Sensors**: Stuck values across consecutive readings
- **Multivariate Inconsistency**: Statistically impossible sensor combinations
- **Communication Errors**: Missing sensor data detection
- **ML Anomalies**: Isolation Forest detection of unusual patterns

### Pages

| Route | Purpose |
|-------|---------|
| `/` | Operational command centre: station status, live readings, current detection, real-time chart, sensor health, concise model / root-cause / explanation summaries, links to the deeper pages |
| `/how-model-works` | The full detection pipeline explained in 12 steps, each with a plain-language section and expandable technical detail, plus an explicit "what this system does not claim" section |
| `/root-cause` | Root-cause classes, live heuristic shares, the shares stored on the latest unresolved event, and the methodology (including the fact that drift has no dedicated signal) |
| `/explanations` | Persistent anomaly queue: one card per event with its own explanation, corrected value, recommendations, root causes and a resolution checkbox |
| `/history` | Searchable, filterable session log (day, date, time range, sensor, anomaly type, severity, status) with expandable event details |

### Shell and components
- **Splash screen**: one-time startup overlay (plays once per page load, never on internal navigation)
- **App shell**: shared header, navigation drawer, connection banner, footer and the single 4-second polling provider
- **Station Status Banner**: overall status, unresolved count, sensor integrity
- **Sensor Reading Cards**: live values, trend vs previous reading and the range actually observed in the loaded window
- **Anomaly Alert Card**: current detection only — it links to the explanation queue instead of substituting a past event
- **Real-Time Chart**: temperature and humidity on the left axis, pressure in real hPa on a dedicated right axis
- **Detection Flow Diagram**: pipeline card with measured inference latency
- **Sensor Health Cards**: per-sensor health monitoring
- **Root-Cause Breakdown**: shared probability bars used by both the dashboard card and the root-cause page
- **Anomaly Event Card**: full event view with the resolution workflow (inline confirmation for high-severity events)
- **Anomaly History Table**: responsive table (desktop) / cards (mobile) with expandable details

## 🔧 Configuration

### Environment Variables

**Frontend** (`frontend/.env`):
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### API Configuration

The API automatically loads historical data from `data/test_processed.csv` for simulation. The simulation ticks every 3.5 seconds, feeding readings through the anomaly detection pipeline.

The frontend dev server runs on port `4028` (`npm run dev`). Point it at the backend with
`NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:8000` for local development); set the
same variable in Vercel for production and the Render URL in `ALLOWED_ORIGINS` on the backend.

## 📁 Project Structure

```
.
├── api/
│   ├── main.py              # FastAPI backend with simulator
│   └── requirements.txt     # Python dependencies
├── data/
│   ├── demo_data.csv        # Curated demo dataset
│   ├── weather_data.csv     # Raw weather data
│   └── *.csv                # Processed datasets
├── docs/
│   └── notes.txt            # Development notes
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/            # React UI components (AppShell, navigation, cards, charts)
│   │   │   ├── how-model-works/page.tsx
│   │   │   ├── root-cause/page.tsx
│   │   │   ├── explanations/page.tsx
│   │   │   ├── history/page.tsx
│   │   │   ├── page.tsx               # Dashboard
│   │   │   └── layout.tsx             # Root layout -> AppShell
│   │   ├── hooks/
│   │   │   ├── useLiveDashboardData.tsx  # Single polling provider + consumer hook
│   │   │   └── useResolveAnomaly.ts      # Resolution with operator feedback
│   │   ├── lib/                       # api client, anomaly domain logic, navigation model
│   │   ├── types/skyguard.ts          # Shared API contract types
│   │   └── styles/                    # CSS styles
│   └── package.json                   # Node.js dependencies
├── ml/
│   ├── detector.py          # SkyGuardDetector class
│   └── *.ipynb              # Jupyter notebooks
└── models/
    ├── skyguard_detector_v2.joblib  # Main detection model
    └── *.joblib             # Supporting models
```

## 🧠 ML Pipeline

1. **Data Understanding** → Exploratory analysis of weather station data
2. **Data Cleaning** → Handle missing values, outliers
3. **Feature Engineering** → Rolling statistics, differencing, temporal features
4. **Anomaly Injection** → Generate labeled anomaly examples
5. **Preprocessing** → Normalize, split datasets
6. **Model Training** → Isolation Forest + per-sensor residual regressors
7. **Deployment** → Package into SkyGuardDetector class

## 📊 Model Details

- **Algorithm**: Isolation Forest + Per-Sensor Residual Regressors + Rule-based Thresholds
- **Buffer Size**: 24 readings (rolling window)
- **Features**: Temperature, Humidity, Pressure + engineered statistics
- **Anomaly Types**: 5 classes (spike, frozen, multivariate, ML, communication)

## 🛠️ Development

### Frontend Development

```bash
cd frontend
npm run dev          # Start dev server on port 4028
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Backend Development

```bash
cd api
python main.py       # Direct execution
uvicorn main:app --reload  # With auto-reload
```

## 📝 License

This project is for educational and research purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
