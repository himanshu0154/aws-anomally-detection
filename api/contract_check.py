"""
SkyGuard AI — executable API contract for the anomaly lifecycle and chart series.

Run from the repository root with a virtualenv that has the backend requirements
plus httpx (which TestClient needs):

    python -m venv .venv
    .venv/Scripts/python -m pip install -r requirements.txt httpx   # Windows
    .venv/bin/python -m pip install -r requirements.txt httpx       # macOS / Linux
    .venv/Scripts/python api/contract_check.py

It drives the real FastAPI app (lifespan, detector, history store, resolve
endpoint) with real rows from data/test_processed.csv and asserts the invariants
the frontend depends on. Exit code is non-zero if any check fails.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'api'))

import pandas as pd  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402

failures = []


def check(label, condition, detail=''):
    if not condition:
        failures.append(label)
    print(f'[{"PASS" if condition else "FAIL"}] {label}{" :: " + str(detail) if detail else ""}')


DF = pd.read_csv(ROOT / 'data' / 'test_processed.csv')


def send(client, row):
    """POST a dataset row and return its ISO timestamp plus the live response."""
    timestamp = str(row['datetime']).replace(' ', 'T') + 'Z'
    response = client.post('/detect', json={
        'timestamp': timestamp,
        'T2M': float(row['T2M']),
        'RH2M': float(row['RH2M']),
        'PS': float(row['PS']),
    })
    response.raise_for_status()
    return timestamp, response.json()


def history_by_timestamp(client):
    history = client.get('/api/history?limit=500').json()
    return history, {record['timestamp']: record for record in history}


with TestClient(main.app) as client:
    # Deterministic run: the lifespan starts the simulator, we drive the readings ourselves.
    main._simulator_running = False

    # ── normal readings ─────────────────────────────────────────────────────
    seen = {}
    for index in range(240, 270):  # rows 240-269 carry no injected anomaly
        timestamp, live = send(client, DF.iloc[index])
        seen[timestamp] = live

    history, by_timestamp = history_by_timestamp(client)
    check('one stored record per processed reading',
          len([r for r in history if r['timestamp'] in seen]) == len(seen),
          f"{len(seen)} readings")
    check('ids are unique', len(history) == len({r['id'] for r in history}), f'{len(history)} records')

    normal_records = [r for r in history if r['status'] == 'Normal']
    check('normal readings are stored as Normal', len(normal_records) >= 30, len(normal_records))
    check('normal records are never resolved', all(r['resolved'] is False for r in normal_records))
    check('normal records keep raw_type normal', all(r['raw_type'] == 'normal' for r in normal_records))
    check('every record carries the full lifecycle contract',
          all({'id', 'station_id', 'timestamp', 'date', 'day', 'time', 'sensor', 'reading', 'type', 'raw_type',
               'severity', 'status', 'explanation', 'recommendations', 'anomaly_score', 'corrected_value',
               'root_cause_probabilities', 'current_raw_reading', 'resolved', 'resolved_at'} <= set(record)
              for record in history))
    check('live is normal while only normal readings arrive',
          seen[str(DF.iloc[269]['datetime']).replace(' ', 'T') + 'Z']['anomaly_status'] == 'normal')

    # ── anomaly becomes a persistent Active event ────────────────────────────
    spike_row = DF.iloc[270].copy()
    spike_row['T2M'] = float(DF.iloc[269]['T2M']) + 20.0
    spike_timestamp, spike_live = send(client, spike_row)
    check('a spike reading is detected live', spike_live['anomaly_status'] == 'anomaly', spike_live['anomaly_type'])
    check('a spike reading is high severity', spike_live['severity'] == 'high')

    history, by_timestamp = history_by_timestamp(client)
    spike = by_timestamp[spike_timestamp]
    check('the anomaly is stored as Active', spike['status'] == 'Active', spike['status'])
    check('the anomaly keeps its own type label', spike['type'] == 'Sudden Spike', spike['type'])
    check('the anomaly keeps its own explanation, recommendations and shares',
          bool(spike['explanation']) and len(spike['recommendations']) == 3
          and sum(spike['root_cause_probabilities'].values()) == 100)

    # ── later normal readings must not close it ─────────────────────────────
    for index in range(271, 285):
        send(client, DF.iloc[index])

    history, by_timestamp = history_by_timestamp(client)
    check('still Active after 14 normal readings', by_timestamp[spike_timestamp]['status'] == 'Active',
          by_timestamp[spike_timestamp]['status'])
    check('still unresolved after later normal readings', by_timestamp[spike_timestamp]['resolved'] is False)
    check('its stored reading is unchanged by later readings',
          by_timestamp[spike_timestamp]['current_raw_reading'] == spike['current_raw_reading'])
    check('live detection can be normal while the event stays Active',
          client.get('/api/live').json()['anomaly_status'] == 'normal')

    # ── operator resolution ─────────────────────────────────────────────────
    resolved = client.post(f"/api/history/{spike['id']}/resolve")
    check('resolve returns 200', resolved.status_code == 200, resolved.status_code)
    body = resolved.json()
    check('resolve sets Resolved, never Normal', body['status'] == 'Resolved', body['status'])
    check('resolve sets resolved true plus a timestamp',
          body['resolved'] is True and bool(body['resolved_at']), body['resolved_at'])
    check('resolve returns the same event id', body['id'] == spike['id'])

    again = client.post(f"/api/history/{spike['id']}/resolve")
    check('resolve is idempotent', again.status_code == 200 and again.json()['resolved_at'] == body['resolved_at'])

    history, by_timestamp = history_by_timestamp(client)
    check('resolved survives a fresh history fetch', by_timestamp[spike_timestamp]['status'] == 'Resolved')
    check('resolution leaves normal records untouched',
          all(by_timestamp[timestamp]['status'] == 'Normal' for timestamp in seen))

    normal_id = next(record['id'] for record in history if record['status'] == 'Normal')
    check('resolving a normal reading is rejected with 400',
          client.post(f'/api/history/{normal_id}/resolve').status_code == 400)
    check('an unknown id is rejected with 404',
          client.post('/api/history/hist-9999/resolve').status_code == 404)

    # ── id hygiene and status vocabulary ────────────────────────────────────
    numbers = [int(record['id'].split('-')[1]) for record in history]
    check('ids are monotonic, newest first', numbers == sorted(numbers, reverse=True), numbers[:4])
    check('statuses stay inside the three lifecycle values',
          {record['status'] for record in history} <= {'Normal', 'Active', 'Resolved'},
          {record['status'] for record in history})
    check('default history limit stays compatible (50)', len(client.get('/api/history').json()) <= 50)

    # ── chart series pressure ───────────────────────────────────────────────
    series = client.get('/api/series?limit=60').json()
    pressures = [point['pressure'] for point in series if point.get('pressure') is not None]
    check('series carries raw pressure on every point', len(pressures) == len(series), f'{len(pressures)}/{len(series)}')
    check('series pressure varies with the readings', len(set(pressures)) > 5, sorted(set(pressures))[:6])
    check('series pressure stays in the real hPa band', all(900 < p < 1100 for p in pressures),
          (min(pressures), max(pressures)))
    check('series pressure spread survives the round trip (>3 hPa)',
          max(pressures) - min(pressures) > 3, round(max(pressures) - min(pressures), 1))
    check('the legacy scaled value stays reversible', all(
        abs(point['pressureScaled'] * 10 - point['pressure']) < 0.05
        for point in series if point.get('pressure') is not None))
    check('series flags anomaly points', any(point['anomaly'] for point in series))

    live = client.get('/api/live').json()
    check('live exposes measured inference latency',
          isinstance(live['model_meta'].get('inference_latency_ms'), (int, float)),
          live['model_meta'].get('inference_latency_ms'))

print()
for failure in failures:
    print(' -', failure)
print(f'{len(failures)} failure(s)' if failures else 'ALL CHECKS PASSED')
sys.exit(1 if failures else 0)
