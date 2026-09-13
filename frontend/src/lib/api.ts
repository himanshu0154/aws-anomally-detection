/**
 * Backend access layer. Every network call in the app goes through here so the
 * base URL, error shape and endpoints live in one place.
 *
 * Production reads NEXT_PUBLIC_API_BASE_URL (the Render backend); local
 * development falls back to the uvicorn default on port 8000.
 */

import type { AnomalyEvent, SeriesPoint, LiveReading } from '@/types/skyguard';

export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000').replace(
  /\/$/,
  ''
);

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new ApiError('Unable to connect to SkyGuard AI backend', 0);
  }

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body && typeof body.detail === 'string') detail = body.detail;
    } catch {
      // keep the status line
    }
    throw new ApiError(detail, response.status);
  }

  return (await response.json()) as T;
}

export const getLive = () => request<LiveReading>('/api/live');

export const getSeries = (limit = 40) => request<SeriesPoint[]>(`/api/series?limit=${limit}`);

/** `limit` keeps the legacy `?limit=50` contract; this app asks for a deeper session window. */
export const getHistory = (limit = 200) => request<AnomalyEvent[]>(`/api/history?limit=${limit}`);

/** Marks one anomaly event resolved on the backend and returns the stored record. */
export const resolveAnomalyEvent = (eventId: string) =>
  request<AnomalyEvent>(`/api/history/${encodeURIComponent(eventId)}/resolve`, { method: 'POST' });
