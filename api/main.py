from fastapi import FastAPI
from pydantic import BaseModel
from collections import deque
from datetime import datetime
import joblib
import numpy as np
import pandas as pd
import warnings
import sys
import os

warnings.filterwarnings('ignore')

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'ml'))

app = FastAPI(title="SkyGuard AI Detection API")

detector = joblib.load('../models/skyguard_detector_v2.joblib')

# In-memory per-station rolling buffer (last 24 readings each)
BUFFER_SIZE = 24
station_buffers = {}


class SensorReading(BaseModel):
    station_id: str
    timestamp: str
    T2M: float
    RH2M: float
    PS: float


def build_engineered_row(buffer):
    """Same logic proven correct in the notebook simulation, adapted for a live buffer."""
    df = pd.DataFrame(buffer)
    current = df.iloc[-1]

    if len(df) >= 2:
        previous = df.iloc[-2]
        t2m_diff = current['T2M'] - previous['T2M']
        rh2m_diff = current['RH2M'] - previous['RH2M']
        ps_diff = current['PS'] - previous['PS']
    else:
        # first-ever reading for this station - no prior value to diff against
        t2m_diff = rh2m_diff = ps_diff = 0.0

    ts = pd.to_datetime(current['timestamp'])

    row = {
        'T2M': current['T2M'], 'RH2M': current['RH2M'], 'PS': current['PS'],
        'hour': ts.hour, 'month': ts.month,
        'T2M_diff': t2m_diff, 'RH2M_diff': rh2m_diff, 'PS_diff': ps_diff,
        'T2M_roll_mean': df['T2M'].mean(), 'RH2M_roll_mean': df['RH2M'].mean(), 'PS_roll_mean': df['PS'].mean(),
        'T2M_roll_std': df['T2M'].std() if len(df) > 1 else 0.0,
        'RH2M_roll_std': df['RH2M'].std() if len(df) > 1 else 0.0,
        'PS_roll_std': df['PS'].std() if len(df) > 1 else 0.0,
    }
    row['T2M_roll_dev'] = row['T2M'] - row['T2M_roll_mean']
    row['RH2M_roll_dev'] = row['RH2M'] - row['RH2M_roll_mean']
    row['PS_roll_dev'] = row['PS'] - row['PS_roll_mean']
    return pd.Series(row)


@app.post("/detect")
def detect_anomaly(reading: SensorReading):
    if reading.station_id not in station_buffers:
        station_buffers[reading.station_id] = deque(maxlen=BUFFER_SIZE)

    buffer = station_buffers[reading.station_id]
    buffer.append(reading.dict())

    engineered_row = build_engineered_row(list(buffer))
    recent_temps = np.array([r['T2M'] for r in list(buffer)[-7:-1]])

    result = detector.detect(engineered_row, recent_temps)

    result['station_id'] = reading.station_id
    result['timestamp'] = reading.timestamp
    result['readings_in_buffer'] = len(buffer)
    result['fully_warmed_up'] = len(buffer) >= BUFFER_SIZE

    return result


@app.get("/")
def root():
    return {"status": "SkyGuard AI API is running"}