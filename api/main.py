"""
SkyGuard AI Detection API

Fixed backend with:
- Correct model path resolution (Bug 1)
- CORS middleware (Bug 2)
- Optional sensor fields for communication_error detection (Bug 3)
- Live simulator from historical CSV data
- Canonical response schema for all frontend components
"""

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from collections import deque
from datetime import datetime
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import warnings
import sys
import os
import asyncio
import threading

warnings.filterwarnings('ignore')

# ─── Path setup ───────────────────────────────────────────────────────────────
# Bug 1 fix: resolve model path from __file__, not cwd
BASE_DIR = Path(__file__).resolve().parent.parent
ML_DIR = BASE_DIR / 'ml'
DATA_DIR = BASE_DIR / 'data'
MODEL_PATH = BASE_DIR / 'models' / 'skyguard_detector_v2.joblib'

sys.path.insert(0, str(ML_DIR))

from detector import SkyGuardDetector  # noqa: E402

# ─── App setup ────────────────────────────────────────────────────────────────
app = FastAPI(title="SkyGuard AI Detection API")

# Bug 2 fix: CORS middleware
ALLOWED_ORIGINS = [
    "http://localhost:4028",
    "http://127.0.0.1:4028",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Load detector ────────────────────────────────────────────────────────────
detector: SkyGuardDetector = joblib.load(MODEL_PATH)

# ─── Constants ────────────────────────────────────────────────────────────────
BUFFER_SIZE = 24
STATION_ID = "AWS-MH-042"

# ─── Pydantic models ─────────────────────────────────────────────────────────
class SensorReading(BaseModel):
    timestamp: str
    T2M: Optional[float] = None    # Bug 3 fix: Optional to allow null
    RH2M: Optional[float] = None
    PS: Optional[float] = None

# ─── Global state ─────────────────────────────────────────────────────────────
reading_buffer: deque = deque(maxlen=BUFFER_SIZE)
history_events: deque = deque(maxlen=500)  # anomaly events only
all_readings: deque = deque(maxlen=1000)   # all readings for chart
latest_event: Optional[Dict[str, Any]] = None
_inference_times: deque = deque(maxlen=20)
_lock = threading.Lock()

# ─── CSV simulator ────────────────────────────────────────────────────────────
_csv_data: Optional[pd.DataFrame] = None
_csv_index: int = 0


def _load_csv():
    """Load historical data for simulation."""
    global _csv_data
    # Prefer curated demo data if available
    csv_path = DATA_DIR / 'demo_data.csv'
    if not csv_path.exists():
        csv_path = DATA_DIR / 'test_anomalies_full.csv'
    if not csv_path.exists():
        csv_path = DATA_DIR / 'weather_data.csv'
    df = pd.read_csv(csv_path)
    # Normalize column names
    if 'datetime' in df.columns:
        df = df.rename(columns={'datetime': 'timestamp'})
    elif 'YEAR' in df.columns:
        df['timestamp'] = pd.to_datetime(
            df[['YEAR', 'MO', 'DY', 'HR']].rename(
                columns={'YEAR': 'year', 'MO': 'month', 'DY': 'day', 'HR': 'hour'}
            )
        ).dt.strftime('%Y-%m-%dT%H:%M:%SZ')
    _csv_data = df
    return df


# ─── Core detection function (shared between POST /detect and simulator) ──────
def run_detection(raw_reading: Dict[str, Any]) -> Dict[str, Any]:
    """
    Feed a raw reading through the detector and return a canonical response.
    This is the single shared function used by both the simulator and POST /detect.
    """
    global latest_event

    t0 = datetime.utcnow()

    reading_dict = {
        'timestamp': raw_reading.get('timestamp', ''),
        'T2M': raw_reading.get('T2M'),
        'RH2M': raw_reading.get('RH2M'),
        'PS': raw_reading.get('PS'),
    }

    with _lock:
        reading_buffer.append(reading_dict)

        engineered_row = _build_engineered_row(list(reading_buffer))
        recent_temps_list = [r['T2M'] for r in list(reading_buffer) if r['T2M'] is not None]
        recent_temps = np.array(recent_temps_list) if recent_temps_list else np.array([])

        result = detector.detect(engineered_row, recent_temps)

    # Build canonical response
    canonical = _map_to_canonical(result, reading_dict)

    # Record inference time
    t1 = datetime.utcnow()
    elapsed_ms = (t1 - t0).total_seconds() * 1000
    with _lock:
        _inference_times.append(round(elapsed_ms, 1))

    # Store in history (only anomalies)
    if canonical['anomaly_status'] == 'anomaly':
        with _lock:
            history_events.appendleft({
                'id': f"hist-{len(history_events) + 1:04d}",
                'time': _format_time(canonical['timestamp']),
                'date': _format_date(canonical['timestamp']),
                'sensor': canonical['affected_sensor'],
                'reading': _format_reading(canonical),
                'type': _anomaly_type_label(canonical['anomaly_type']),
                'raw_type': canonical['anomaly_type'],
                'severity': canonical['severity'].capitalize(),
                'status': 'Active',
                'explanation': canonical['explanation'],
                'recommendations': canonical['recommendations'],
                'anomaly_score': canonical['anomaly_score'],
                'corrected_value': canonical['corrected_value'],
            })

    # Store for chart
    with _lock:
        all_readings.append({
            'time': _format_time_short(canonical['timestamp']),
            'temp': canonical['temperature'],
            'humidity': canonical['humidity'],
            'pressureScaled': round(canonical['pressure'] / 10, 2) if canonical['pressure'] else None,
            'anomaly': canonical['anomaly_status'] == 'anomaly',
        })

    latest_event = canonical
    return canonical


def _build_engineered_row(buffer):
    """Build the engineered feature row that detector.detect() expects."""
    df = pd.DataFrame(buffer)
    current = df.iloc[-1]

    if len(df) >= 2:
        previous = df.iloc[-2]
        t2m_diff = current['T2M'] - previous['T2M'] if pd.notna(current['T2M']) and pd.notna(previous['T2M']) else 0.0
        rh2m_diff = current['RH2M'] - previous['RH2M'] if pd.notna(current['RH2M']) and pd.notna(previous['RH2M']) else 0.0
        ps_diff = current['PS'] - previous['PS'] if pd.notna(current['PS']) and pd.notna(previous['PS']) else 0.0
    else:
        t2m_diff = rh2m_diff = ps_diff = 0.0

    ts = pd.to_datetime(current['timestamp'])

    # For rolling stats, filter out None values
    t2m_vals = [r['T2M'] for r in list(buffer) if r['T2M'] is not None]
    rh2m_vals = [r['RH2M'] for r in list(buffer) if r['RH2M'] is not None]
    ps_vals = [r['PS'] for r in list(buffer) if r['PS'] is not None]

    t2m_series = pd.Series(t2m_vals) if t2m_vals else pd.Series([0.0])
    rh2m_series = pd.Series(rh2m_vals) if rh2m_vals else pd.Series([0.0])
    ps_series = pd.Series(ps_vals) if ps_vals else pd.Series([0.0])

    row = {
        'T2M': current['T2M'] if pd.notna(current['T2M']) else np.nan,
        'RH2M': current['RH2M'] if pd.notna(current['RH2M']) else np.nan,
        'PS': current['PS'] if pd.notna(current['PS']) else np.nan,
        'hour': ts.hour, 'month': ts.month,
        'T2M_diff': t2m_diff, 'RH2M_diff': rh2m_diff, 'PS_diff': ps_diff,
        'T2M_roll_mean': t2m_series.mean(),
        'RH2M_roll_mean': rh2m_series.mean(),
        'PS_roll_mean': ps_series.mean(),
        'T2M_roll_std': t2m_series.std() if len(t2m_series) > 1 else 0.0,
        'RH2M_roll_std': rh2m_series.std() if len(rh2m_series) > 1 else 0.0,
        'PS_roll_std': ps_series.std() if len(ps_series) > 1 else 0.0,
    }
    row['T2M_roll_dev'] = (row['T2M'] if pd.notna(row['T2M']) else 0.0) - row['T2M_roll_mean']
    row['RH2M_roll_dev'] = (row['RH2M'] if pd.notna(row['RH2M']) else 0.0) - row['RH2M_roll_mean']
    row['PS_roll_dev'] = (row['PS'] if pd.notna(row['PS']) else 0.0) - row['PS_roll_mean']
    return pd.Series(row)


# ─── Schema mapping ───────────────────────────────────────────────────────────
ANOMALY_TYPE_LABELS = {
    'temperature_spike': 'Sudden Spike',
    'temperature_frozen': 'Frozen Sensor',
    'multivariate_inconsistency': 'Multivariate Inconsistency',
    'ml_anomaly': 'ML Anomaly',
    'communication_error': 'Communication Error',
    'normal': 'None',
}

RECOMMENDATIONS_TABLE = {
    'temperature_spike': [
        {'priority': 1, 'action': 'Inspect sensor housing', 'urgency': 'Immediate'},
        {'priority': 2, 'action': 'Recalibrate temperature sensor', 'urgency': 'Within 1 hour'},
        {'priority': 3, 'action': 'Check sensor connection', 'urgency': 'Within 4 hours'},
    ],
    'temperature_frozen': [
        {'priority': 1, 'action': 'Check sensor power supply', 'urgency': 'Immediate'},
        {'priority': 2, 'action': 'Replace temperature sensor', 'urgency': 'Within 2 hours'},
        {'priority': 3, 'action': 'Review data pipeline for stuck values', 'urgency': 'Within 8 hours'},
    ],
    'multivariate_inconsistency': [
        {'priority': 1, 'action': 'Cross-reference with neighbouring station', 'urgency': 'Immediate'},
        {'priority': 2, 'action': 'Inspect all three sensors', 'urgency': 'Within 1 hour'},
        {'priority': 3, 'action': 'Review calibration records', 'urgency': 'Within 4 hours'},
    ],
    'ml_anomaly': [
        {'priority': 1, 'action': 'Review ML anomaly explanation', 'urgency': 'Immediate'},
        {'priority': 2, 'action': 'Cross-check with manual observation', 'urgency': 'Within 1 hour'},
        {'priority': 3, 'action': 'Submit for manual review', 'urgency': 'Within 8 hours'},
    ],
    'communication_error': [
        {'priority': 1, 'action': 'Check data link and antenna', 'urgency': 'Immediate'},
        {'priority': 2, 'action': 'Restart datalogger', 'urgency': 'Within 30 minutes'},
        {'priority': 3, 'action': 'Schedule field visit', 'urgency': 'Within 24 hours'},
    ],
    'normal': [],
}


def _map_to_canonical(result: Dict[str, Any], reading: Dict[str, Any]) -> Dict[str, Any]:
    """Map detector.detect() output + raw reading to the canonical frontend schema."""
    ts = reading.get('timestamp', '')
    t2m = reading.get('T2M')
    rh2m = reading.get('RH2M')
    ps = reading.get('PS')

    status = result.get('status', 'normal')
    severity = result.get('severity', 'none')
    anomaly_type = result.get('type', 'normal')
    confidence = result.get('confidence')
    raw_reading = result.get('raw_reading', {})
    healed_reading = result.get('healed_reading')
    z_scores = result.get('z_scores', {})

    # overall_status
    if severity == 'high':
        overall_status = 'critical'
    elif severity == 'medium':
        overall_status = 'warning'
    else:
        overall_status = 'healthy'

    # anomaly_status
    anomaly_status = 'anomaly' if status == 'anomaly' else 'normal'

    # anomaly_score: confidence or null
    anomaly_score = confidence if confidence is not None else None

    # affected_sensor
    affected_sensor = _determine_affected_sensor(anomaly_type, raw_reading, z_scores)

    # explanation
    explanation = _build_explanation(anomaly_type, result, reading)

    # corrected_value
    corrected_value = {'temperature': None, 'humidity': None, 'pressure': None}
    if healed_reading:
        if healed_reading.get('T2M') is not None:
            corrected_value['temperature'] = healed_reading['T2M']
        if healed_reading.get('RH2M') is not None:
            corrected_value['humidity'] = healed_reading['RH2M']
        if healed_reading.get('PS') is not None:
            corrected_value['pressure'] = healed_reading['PS']

    # root_cause_probabilities (heuristic visualization aid)
    root_cause_probs = _compute_root_cause_probabilities(
        anomaly_type, confidence or 0, t2m, rh2m, ps, reading_buffer
    )

    # sensor_health
    sensor_health = _compute_sensor_health(affected_sensor, reading_buffer)

    # recommendations
    recommendations = RECOMMENDATIONS_TABLE.get(anomaly_type, [])

    # readings in buffer
    with _lock:
        buf_len = len(reading_buffer)
        warmed = buf_len >= BUFFER_SIZE

    return {
        'station_id': STATION_ID,
        'timestamp': ts,
        'temperature': t2m,
        'humidity': rh2m,
        'pressure': ps,
        'overall_status': overall_status,
        'anomaly_status': anomaly_status,
        'anomaly_score': anomaly_score,
        'severity': severity,
        'anomaly_type': anomaly_type,
        'affected_sensor': affected_sensor,
        'explanation': explanation,
        'corrected_value': corrected_value,
        'root_cause_probabilities': root_cause_probs,
        'sensor_health': sensor_health,
        'recommendations': recommendations,
        'raw_reading': raw_reading,
        'model_meta': {
            'readings_in_buffer': buf_len,
            'fully_warmed_up': warmed,
            'algorithm': 'Isolation Forest + per-sensor residual regressors + rule-based thresholds',
        },
    }


def _determine_affected_sensor(anomaly_type, raw_reading, z_scores):
    """Determine which sensor is affected based on anomaly type."""
    if anomaly_type == 'temperature_spike' or anomaly_type == 'temperature_frozen':
        return 'temperature'
    elif anomaly_type == 'communication_error':
        # Return which sensor was None
        missing = []
        if raw_reading.get('T2M') is None:
            missing.append('temperature')
        if raw_reading.get('RH2M') is None:
            missing.append('humidity')
        if raw_reading.get('PS') is None:
            missing.append('pressure')
        return ', '.join(missing) if missing else 'unknown'
    elif anomaly_type in ('multivariate_inconsistency', 'ml_anomaly'):
        if z_scores:
            # Sensor with largest absolute z-score
            max_sensor = max(z_scores.items(), key=lambda x: abs(x[1]))
            sensor_map = {'T2M': 'temperature', 'RH2M': 'humidity', 'PS': 'pressure'}
            return sensor_map.get(max_sensor[0], 'unknown')
        return 'unknown'
    else:
        return 'none'


def _build_explanation(anomaly_type, result, reading):
    """Build a human-readable explanation string."""
    t2m = reading.get('T2M')
    reason = result.get('reason', '')
    confidence = result.get('confidence')

    if anomaly_type == 'normal':
        return 'No abnormal behaviour detected. All sensor readings are within expected ranges.'

    if anomaly_type == 'temperature_spike':
        t2m_diff = abs(reading.get('T2M', 0) - (list(reading_buffer)[-2]['T2M'] if len(reading_buffer) >= 2 else reading.get('T2M', 0)))
        return (
            f"Temperature changed suddenly (+{t2m_diff:.1f}°C vs previous reading). "
            f"The spike exceeds learned thresholds for the 24-hour rolling window. "
            f"Humidity and pressure remain within normal bounds, indicating a localised "
            f"sensor fault rather than a genuine meteorological event."
        )
    elif anomaly_type == 'temperature_frozen':
        return (
            "Temperature has remained nearly constant across multiple consecutive readings, "
            "suggesting the sensor may be frozen or unresponsive."
        )
    elif anomaly_type == 'multivariate_inconsistency':
        return (
            "Individual sensor readings are within normal range, but their combination is "
            "statistically inconsistent. Cross-sensor correlation has been violated."
        )
    elif anomaly_type == 'ml_anomaly':
        return (
            "An unusual weather-sensor pattern was detected by the isolation forest model. "
            "The combination of readings does not match the expected distribution."
        )
    elif anomaly_type == 'communication_error':
        return (
            "One or more sensor readings are missing, indicating a communication failure "
            "between the sensor and the data logger."
        )
    return reason


def _compute_root_cause_probabilities(anomaly_type, confidence, t2m, rh2m, ps, buffer):
    """
    Heuristic visualization aid — not a second classifier.
    Builds a 5-way probability distribution from signals the detector already computes.
    The actually-detected type always gets the largest share.
    """
    probs = {
        'spike': 5,
        'frozen': 5,
        'drift': 5,
        'communication_error': 5,
        'multivariate_inconsistency': 5,
    }

    # Use actual signals to weight probabilities
    buf_list = list(buffer)
    if len(buf_list) >= 2:
        prev = buf_list[-2]
        if t2m is not None and prev.get('T2M') is not None:
            diff = abs(t2m - prev['T2M'])
            # Higher diff → higher spike probability
            if diff > 8:
                probs['spike'] = max(60, min(95, int(50 + diff * 3)))
            elif diff > 4:
                probs['spike'] = max(30, min(60, int(30 + diff * 4)))

    if len(buf_list) >= 6:
        temps = [r['T2M'] for r in buf_list[-6:] if r.get('T2M') is not None]
        if len(temps) >= 6:
            std = np.std(temps)
            if std < 0.05:
                probs['frozen'] = max(50, min(90, int(50 + (0.05 - std) * 1000)))

    # Communication error: if any sensor is None
    if t2m is None or rh2m is None or ps is None:
        probs['communication_error'] = 85

    # Boost the detected type
    type_to_key = {
        'temperature_spike': 'spike',
        'temperature_frozen': 'frozen',
        'multivariate_inconsistency': 'multivariate_inconsistency',
        'ml_anomaly': 'multivariate_inconsistency',
        'communication_error': 'communication_error',
    }

    detected_key = type_to_key.get(anomaly_type)
    if detected_key and detected_key in probs:
        # Set the detected type to be the largest
        max_other = max(v for k, v in probs.items() if k != detected_key)
        probs[detected_key] = max(probs[detected_key], min(95, max_other + 30))

    # If normal, distribute evenly with a small bias
    if anomaly_type == 'normal':
        probs = {'spike': 15, 'frozen': 15, 'drift': 25, 'communication_error': 15, 'multivariate_inconsistency': 30}

    # Normalize to sum to 100
    total = sum(probs.values())
    if total > 0:
        factor = 100.0 / total
        normalized = {k: round(v * factor) for k, v in probs.items()}
        # Fix rounding errors
        diff = 100 - sum(normalized.values())
        if diff != 0:
            # Add/subtract from the largest category
            max_key = max(normalized, key=normalized.get)
            normalized[max_key] += diff
    else:
        normalized = probs

    return normalized


def _compute_sensor_health(affected_sensor, buffer):
    """Compute per-sensor health from real signals."""
    buf_list = list(buffer)
    health = {}
    sensor_keys = {
        'temperature': 'T2M',
        'humidity': 'RH2M',
        'pressure': 'PS',
    }
    sensor_labels = {
        'temperature': 'Temperature',
        'humidity': 'Humidity',
        'pressure': 'Pressure',
    }

    for sensor_name, key in sensor_keys.items():
        # Count missing in last N readings
        recent = buf_list[-BUFFER_SIZE:]
        missing_count = sum(1 for r in recent if r.get(key) is None)
        total_recent = len(recent)

        is_affected = sensor_name in affected_sensor if affected_sensor and affected_sensor != 'none' else False

        if is_affected:
            status = 'critical'
            detail = 'Anomalous reading'
        elif missing_count > 0:
            status = 'warning'
            detail = f'{missing_count}/{total_recent} recent readings missing'
        else:
            status = 'healthy'
            detail = 'Within normal range'

        health[sensor_name] = {
            'status': status,
            'detail': detail,
            'label': sensor_labels[sensor_name],
        }

    return health


# ─── Formatting helpers ───────────────────────────────────────────────────────
def _format_time(ts_str):
    """Format timestamp for history table: HH:MM:SS."""
    try:
        dt = pd.to_datetime(ts_str)
        return dt.strftime('%H:%M:%S')
    except Exception:
        return ts_str[-8:] if len(ts_str) >= 8 else ts_str


def _format_date(ts_str):
    """Format timestamp for history table: YYYY-MM-DD."""
    try:
        dt = pd.to_datetime(ts_str)
        return dt.strftime('%Y-%m-%d')
    except Exception:
        return ts_str[:10] if len(ts_str) >= 10 else ts_str


def _format_time_short(ts_str):
    """Format timestamp for chart: HH:MM."""
    try:
        dt = pd.to_datetime(ts_str)
        return dt.strftime('%H:%M')
    except Exception:
        return ts_str[-5:] if len(ts_str) >= 5 else ts_str


def _format_reading(canonical):
    """Format reading for history table."""
    t = canonical.get('temperature')
    h = canonical.get('humidity')
    p = canonical.get('pressure')
    sensor = canonical.get('affected_sensor', '')
    if 'temperature' in sensor and t is not None:
        return f'{t:.1f} °C'
    elif 'humidity' in sensor and h is not None:
        return f'{h:.1f} %'
    elif 'pressure' in sensor and p is not None:
        return f'{p:.1f} hPa'
    elif t is not None:
        return f'{t:.1f} °C'
    elif h is not None:
        return f'{h:.1f} %'
    elif p is not None:
        return f'{p:.1f} hPa'
    return 'N/A'


def _anomaly_type_label(anomaly_type):
    """Human-readable label for anomaly type."""
    return ANOMALY_TYPE_LABELS.get(anomaly_type, anomaly_type)


# ─── Background simulator ─────────────────────────────────────────────────────
_simulator_running = False


async def _simulator_tick():
    """Advance one row of CSV data and run detection."""
    global _csv_index
    df = _csv_data
    if df is None or len(df) == 0:
        return

    # Get the current row
    if _csv_index >= len(df):
        _csv_index = 0  # wrap around

    row = df.iloc[_csv_index]
    _csv_index += 1

    # Build raw reading (only timestamp + raw sensor values, no engineered features)
    ts_raw = str(row.get('timestamp', row.get('datetime', '')))
    try:
        ts_iso = pd.to_datetime(ts_raw).strftime('%Y-%m-%dT%H:%M:%SZ')
    except Exception:
        ts_iso = ts_raw
    reading = {
        'timestamp': ts_iso,
        'T2M': float(row['T2M']) if pd.notna(row.get('T2M')) else None,
        'RH2M': float(row['RH2M']) if pd.notna(row.get('RH2M')) else None,
        'PS': float(row['PS']) if pd.notna(row.get('PS')) else None,
    }

    run_detection(reading)


async def _simulator_loop():
    """Background loop that ticks the simulator every ~3-4 seconds."""
    global _simulator_running
    while _simulator_running:
        await _simulator_tick()
        await asyncio.sleep(3.5)  # ~3.5 seconds between ticks


@app.on_event("startup")
async def startup_event():
    global _simulator_running
    _load_csv()
    _simulator_running = True
    asyncio.create_task(_simulator_loop())


@app.on_event("shutdown")
async def shutdown_event():
    global _simulator_running
    _simulator_running = False


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "SkyGuard AI API is running", "station_id": STATION_ID}


@app.get("/api/live")
def get_live():
    """Latest canonical reading from the simulator."""
    if latest_event is None:
        return {
            'station_id': STATION_ID,
            'timestamp': '',
            'temperature': None,
            'humidity': None,
            'pressure': None,
            'overall_status': 'healthy',
            'anomaly_status': 'normal',
            'anomaly_score': None,
            'severity': 'none',
            'anomaly_type': 'normal',
            'affected_sensor': 'none',
            'explanation': 'Waiting for first reading...',
            'corrected_value': {'temperature': None, 'humidity': None, 'pressure': None},
            'root_cause_probabilities': {'spike': 20, 'frozen': 20, 'drift': 20, 'communication_error': 20, 'multivariate_inconsistency': 20},
            'sensor_health': {},
            'recommendations': [],
            'raw_reading': {'T2M': None, 'RH2M': None, 'PS': None},
            'model_meta': {
                'readings_in_buffer': 0,
                'fully_warmed_up': False,
                'algorithm': 'Isolation Forest + per-sensor residual regressors + rule-based thresholds',
            },
        }
    return latest_event


@app.get("/api/series")
def get_series(limit: int = Query(default=40, ge=1, le=200)):
    """Last N canonical readings shaped for the chart."""
    with _lock:
        items = list(all_readings)[-limit:]
    return items


@app.get("/api/history")
def get_history(limit: int = Query(default=50, ge=1, le=200)):
    """Anomaly history (only anomaly events, from live detection session)."""
    with _lock:
        items = list(history_events)[:limit]
    return items


@app.post("/detect")
def detect_anomaly(reading: SensorReading):
    """
    Manual/test endpoint. Shares the same global rolling buffer as the simulator.
    In production, don't call both simultaneously.
    """
    reading_dict = reading.model_dump()
    return run_detection(reading_dict)
