import React from 'react';
import { Brain, Wrench, AlertCircle, CheckCircle2 } from 'lucide-react';

const recommendations = [
  {
    id: 'rec-inspect',
    priority: 1,
    action: 'Inspect sensor housing',
    detail: 'Check for physical obstruction, direct sun exposure, or heat source near the temperature probe.',
    urgency: 'Immediate',
    urgencyClass: 'status-critical',
  },
  {
    id: 'rec-recalibrate',
    priority: 2,
    action: 'Recalibrate temperature sensor',
    detail: 'Run the on-site calibration routine against the reference thermometer. Acceptable drift: ±0.3 °C.',
    urgency: 'Within 1 hour',
    urgencyClass: 'status-warning',
  },
  {
    id: 'rec-connection',
    priority: 3,
    action: 'Check sensor connection',
    detail: 'Verify cable integrity and connector seating on the datalogger port. Check for corrosion.',
    urgency: 'Within 4 hours',
    urgencyClass: 'status-normal',
  },
];

export default function ExplanationRecommendation() {
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
              {[
                'Temperature rose +18.7 °C in under 4 minutes — exceeds 3σ of the 24h learned envelope.',
                'Humidity and pressure remain within normal bounds — rules out genuine weather event.',
                'Spike pattern matches "localised sensor fault" signature in training corpus (94% confidence).',
                'No correlated anomaly in neighbouring station AWS-MH-041 (12 km away).',
              ]?.map((point, i) => (
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
      <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20 mb-4">
        <AlertCircle size={16} className="text-accent shrink-0" />
        <div>
          <p className="text-xs font-semibold text-accent">Estimated Corrected Value</p>
          <p className="text-xs text-foreground/70 mt-0.5">
            Based on 24h behaviour pattern, expected temperature at 10:16 is approximately{' '}
            <span className="text-accent font-bold font-tabular">~33.7 °C</span> (±1.2 °C).
            Current reading of 52.4 °C is{' '}
            <span className="text-danger font-bold">18.7 °C above</span> the predicted value.
          </p>
        </div>
      </div>
      {/* Recommended actions */}
      <div>
        <p className="text-label-sm text-muted-foreground mb-2.5">Recommended Actions</p>
        <div className="space-y-2">
          {recommendations?.map((rec) => (
            <div
              key={rec?.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/60 group hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-xs font-bold text-muted-foreground shrink-0 mt-0.5">
                {rec?.priority}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-xs font-semibold text-foreground">{rec?.action}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${rec?.urgencyClass} font-medium`}>
                    {rec?.urgency}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{rec?.detail}</p>
              </div>
              <Wrench size={13} className="text-muted-foreground shrink-0 mt-0.5 group-hover:text-foreground transition-colors" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}