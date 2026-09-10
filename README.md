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
| `GET` | `/api/live` | Latest canonical sensor reading |
| `GET` | `/api/series?limit=40` | Time series data for charts |
| `GET` | `/api/history?limit=50` | Anomaly event history |
| `POST` | `/detect` | Manual anomaly detection |

## 🎯 Features

### Real-Time Anomaly Detection
- **Temperature Spikes**: Sudden changes exceeding learned thresholds
- **Frozen Sensors**: Stuck values across consecutive readings
- **Multivariate Inconsistency**: Statistically impossible sensor combinations
- **Communication Errors**: Missing sensor data detection
- **ML Anomalies**: Isolation Forest detection of unusual patterns

### Dashboard Components
- **Station Status Banner**: Overall system health indicator
- **Sensor Reading Cards**: Live temperature, humidity, pressure values
- **Anomaly Alert Card**: AI-powered anomaly notifications
- **Real-Time Charts**: Historical sensor data visualization
- **Detection Flow Diagram**: Pipeline status visualization
- **Sensor Health Cards**: Per-sensor health monitoring
- **Root Cause Classification**: Anomaly type probability breakdown
- **Explanation & Recommendations**: AI-generated insights and actions
- **Anomaly History Table**: Past anomaly events log

## 🔧 Configuration

### Environment Variables

**Frontend** (`frontend/.env`):
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### API Configuration

The API automatically loads historical data from `data/demo_data.csv` for simulation. The simulation ticks every 3.5 seconds, feeding readings through the anomaly detection pipeline.

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
│   │   │   ├── components/  # React UI components
│   │   │   ├── page.tsx     # Main dashboard page
│   │   │   └── layout.tsx   # Root layout
│   │   ├── hooks/
│   │   │   └── useLiveDashboardData.ts  # Data fetching hook
│   │   └── styles/          # CSS styles
│   └── package.json         # Node.js dependencies
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
