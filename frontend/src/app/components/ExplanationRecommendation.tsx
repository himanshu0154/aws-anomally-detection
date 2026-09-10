import React from 'react';
import { Brain, Wrench, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { LiveReading, Recommendation } from '@/hooks/useLiveDashboardData';

interface ExplanationRecommendationProps {
  explanation: string;
  recommendations: Recommendation[];
  correctedValue: { temperature: number | null; humidity: number | null; pressure: number | null };
  live: LiveReading;
}

function buildWhyPoints(live: LiveReading): string[] {
  const points: string[] = [];
  if (live.explanation) {
    points.push(live.explanation);
  }
  if (live.anomaly_type === 'temperature_spike') {
    points.push('Humidity and pressure remain within normal bounds — rules out genuine weather event.');
  }
  if (live.anomaly_score != null) {
    points.push(`Confidence level: ${Math.round(live.anomaly_score)}%.`);
  }
  if (live.affected_sensor && live.affected_sensor !== 'none') {
    points.push(`Primary affected sensor: ${live.affected_sensor}.`);
  }
  return points;
}

function urgencyClass(urgency: string): string {
  if (urgency.toLowerCase().includes('immediate')) return 'status-critical';
  if (urgency.toLowerCase().includes('hour')) return 'status-warning';
  return 'status-normal';
}

export default function ExplanationRecommendation({ explanation, recommendations, correctedValue, live }: ExplanationRecommendationProps) {
  const whyPoints = buildWhyPoints(live);

  const correctedSensor = live.affected_sensor === 'temperature' ? 'temperature'
    : live.affected_sensor === 'humidity' ? 'humidity'
    : 'pressure';
  const correctedUnit = correctedSensor === 'temperature' ? '°C' : correctedSensor === 'humidity' ? '%' : 'hPa';
  const correctedVal = correctedValue[correctedSensor === 'temperature' ? 'temperature' : correctedSensor === 'humidity' ? 'humidity' : 'pressure'];

  return (
    <div className="card-elevated p-5">
      <h2 className="text-base font-semibold text-foreground mb-1">Explanation & Recommendations</h2>
      <p className="text-xs text-muted-foreground mb-4">Why the AI flagged this — and what to do next</p>
      {/* Why flagged */}
      <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20 mb-4">
        <div className="flex items-start gap-2">
          <Brain size={16} className="text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-primary mb-1.5">Why AI Flagged This</p>
            <ul className="space-y-1.5">
              {whyPoints.map((point, i) => (
                <li key={`why-${i}`} className="flex items-start gap-1.5 text-xs text-foreground/80">
                  <CheckCircle2 size={12} className="text-primary mt-0.5 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {/* Estimated corrected value */}
      {correctedVal != null && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20 mb-4">
          <AlertCircle size={16} className="text-accent shrink-0" />
          <div>
            <p className="text-xs font-semibold text-accent">Estimated Corrected Value</p>
            <p className="text-xs text-foreground/70 mt-0.5">
              Based on the 24h behaviour pattern, the expected {correctedSensor} reading is approximately{' '}
              <span className="text-accent font-bold font-tabular">~{correctedVal.toFixed(1)} {correctedUnit}</span>.
              {live.anomaly_status === 'anomaly' && (
                (() => {
                  const key = correctedSensor === 'temperature' ? 'T2M' : correctedSensor === 'humidity' ? 'RH2M' : 'PS';
                  const rawVal = live.raw_reading?.[key as keyof typeof live.raw_reading];
                  return rawVal != null ? (
                    <> Current reading of <span className="text-danger font-bold">{rawVal.toFixed(1)} {correctedUnit}</span> differs from the predicted value.</>
                  ) : null;
                })()
              )}
            </p>
          </div>
        </div>
      )}
      {/* Recommended actions */}
      {recommendations.length > 0 && (
        <div>
          <p className="text-label-sm text-muted-foreground mb-2.5">Recommended Actions</p>
          <div className="space-y-2">
            {recommendations.map((rec) => (
              <div
                key={`rec-${rec.priority}`}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/60 group hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0 mt-0.5">
                  {rec.priority}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-semibold text-foreground">{rec.action}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${urgencyClass(rec.urgency)} font-medium`}>
                      {rec.urgency}
                    </span>
                  </div>
                </div>
                <Wrench size={13} className="text-muted-foreground shrink-0 mt-0.5 group-hover:text-foreground transition-colors" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
