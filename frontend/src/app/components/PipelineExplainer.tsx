import React from 'react';
import {
  ArrowDown,
  Brain,
  CheckCheck,
  Cpu,
  Database,
  Filter,
  GitMerge,
  Gauge,
  Layers,
  ListChecks,
  Radio,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  Wrench,
} from 'lucide-react';
import { InView } from '@/components/ui/in-view';

interface PipelineStep {
  id: string;
  step: number;
  icon: React.ElementType;
  title: string;
  simple: string;
  technical: string[];
}

/**
 * Every statement here describes what `api/main.py` and `ml/detector.py` actually do
 * in this deployment. Where a capability is limited (heuristic shares, unsignalled
 * drift, optional Gemini), the limit is stated instead of rounded up.
 */
const STEPS: PipelineStep[] = [
  {
    id: 'ingestion',
    step: 1,
    icon: Radio,
    title: 'Data ingestion',
    simple:
      "An Automatic Weather Station reports three numbers per reading: temperature, relative humidity and surface pressure, each with a timestamp. The dashboard replays the station's recorded history so the pipeline can be watched live.",
    technical: [
      'Fields: T2M (°C), RH2M (%) and PS (hPa), carried through the pipeline on the same scale the detector validates against (850–1100 hPa).',
      'The backend replays data/test_processed.csv (hourly readings derived from NASA POWER for 28.41°N 77.32°E) one row per simulator tick, every 3.5 seconds.',
      'POST /detect accepts a single reading and runs the identical code path, which is how the API is tested.',
      'Pydantic allows any sensor field to be null, so a real communication gap is representable instead of being guessed at.',
    ],
  },
  {
    id: 'cleaning',
    step: 2,
    icon: Filter,
    title: 'Data cleaning and validation',
    simple:
      'Before anything is judged, missing values are separated from real values. A missing sensor is treated as a signal of its own rather than quietly filled in with an average.',
    technical: [
      'Missing values are preserved as NaN/None through feature building; rolling statistics are computed only over the values that exist.',
      'If any of T2M, RH2M or PS is missing for a reading, the detector returns a communication error with full confidence instead of imputing a value.',
      'Physical validity ranges are enforced when a corrected value is produced: T2M −60…60 °C, RH2M 0…100 %, PS 850…1100 hPa.',
      'Timestamps are normalised to ISO-8601 UTC at ingestion so every stored event carries a consistent date, weekday and time for filtering.',
    ],
  },
  {
    id: 'context',
    step: 3,
    icon: Layers,
    title: 'Rolling context window',
    simple:
      'Weather is only anomalous relative to what came before it, so the model always keeps the last 24 readings in view.',
    technical: [
      'A fixed-length deque holds the most recent 24 readings; older readings roll off automatically.',
      'On startup the buffer is pre-seeded with the first 24 rows so detection starts warmed up rather than blind.',
      'GET /api/live exposes readings_in_buffer and fully_warmed_up, which is what drives the warm-up banner in the dashboard.',
      'The window is what makes "suddenly changed" meaningful: every difference and rolling statistic is relative to it.',
    ],
  },
  {
    id: 'features',
    step: 4,
    icon: Cpu,
    title: 'Feature engineering',
    simple:
      'Raw numbers are turned into behaviour: how fast a value is moving, how it compares with its recent average, and what time of year it is.',
    technical: [
      'Per-reading features: T2M, RH2M, PS, hour and month.',
      'Change features: T2M_diff, RH2M_diff and PS_diff against the previous reading (0.0 when a value is missing).',
      'Rolling features over the 24-reading window: T2M_roll_mean, RH2M_roll_mean, PS_roll_mean and the matching _roll_std (0.0 with fewer than two samples).',
      'Deviation features: *_roll_dev, the current value minus its own rolling mean — a compact "how far from normal am I" signal.',
      'The detector adds three residual z-scores to this vector before the Isolation Forest sees it.',
    ],
  },
  {
    id: 'model',
    step: 5,
    icon: Brain,
    title: 'Machine learning detection',
    simple:
      'An Isolation Forest learns what normal weather-station patterns look like. Anything that is hard to isolate as "normal" is reported as unusual — no labels required.',
    technical: [
      'The packaged model (models/skyguard_detector_v2.joblib) contains the Isolation Forest plus the feature list, residual regressors, their standard deviations and the multivariate threshold, so a single artifact reproduces the training-time behaviour.',
      'The forest scores each reading with decision_function; a prediction of −1 marks the reading as unusual.',
      'Confidence is mapped from the score against the packaged if_score_min / if_score_max bounds, capped to 0–100.',
      'Detections from this path are labelled ML Anomaly: the pattern is unusual, but the rule layer could not say why — which is exactly what the explanation text reports.',
    ],
  },
  {
    id: 'residuals',
    step: 6,
    icon: Target,
    title: 'Residual-based sensor analysis',
    simple:
      'The system also learns how the sensors should relate to each other, then compares what should have happened with what actually happened.',
    technical: [
      'For each sensor a small regressor predicts the value that the other two sensors imply: temperature from humidity and pressure, and so on.',
      'The residual is the gap between the prediction and the observation, divided by the residual standard deviation the regressor had on training data: z = (actual − predicted) / σ.',
      'The multivariate score is the sum of the squared z-scores. Above the packaged threshold (17.08 in this artifact) the reading is reported as multivariate inconsistency.',
      'This is the layer that catches combinations which look plausible one sensor at a time.',
    ],
  },
  {
    id: 'rules',
    step: 7,
    icon: SlidersHorizontal,
    title: 'Rule-based signals',
    simple:
      'A few physical facts do not need a model, so they are written as rules. They run first and give the clearest possible explanation when they fire.',
    technical: [
      'Temperature step: |ΔT| greater than 8 °C between consecutive readings is a sudden spike, severity high.',
      'Frozen sensor: standard deviation of the last six temperatures below 0.05 °C is a frozen sensor, severity medium.',
      'Missing data: any null sensor value is a communication error, severity high.',
      'Rule confidence grows with how far the reading exceeds the threshold, so a large step scores higher than a marginal one.',
      'Because rules are evaluated before the forest, a clean physical explanation wins over a generic ML anomaly whenever both would apply.',
    ],
  },
  {
    id: 'rootcause',
    step: 8,
    icon: GitMerge,
    title: 'Root-cause analysis',
    simple:
      'The detector answers "is this anomalous", which is not the same question as "why". This layer ranks the likely causes so an operator knows where to look.',
    technical: [
      'A five-way share is computed per reading from signals the detector already produced: sudden spike, frozen sensor, sensor drift, communication error and multivariate inconsistency.',
      'The step size raises the spike share, near-zero variance raises the frozen share, and a missing value pins the communication share at 85%.',
      'The type the detector actually reported is always lifted above the others, so the displayed ranking cannot contradict the detection.',
      'Important limit: these shares are a heuristic weighting, not a trained classifier and not calibrated probabilities.',
      'Second limit: sensor drift has no dedicated signal in the current pipeline and therefore stays at its low baseline share. It is shown because operators should know it is monitored-but-unsignalled.',
    ],
  },
  {
    id: 'severity',
    step: 9,
    icon: Gauge,
    title: 'Confidence and severity',
    simple:
      'Every detection carries two independent numbers: how confident the model is, and how much an operator should care.',
    technical: [
      'Severity comes from the rule that fired: high for a sudden temperature step and for missing data, medium for frozen, multivariate and ML detections, none for a normal reading.',
      'Confidence for threshold rules scales linearly with the excess above the threshold, from 50% at the threshold to 100% at double it.',
      'Confidence for ML detections is mapped from the Isolation Forest score; a communication error is reported at 100% because the absence of data is unambiguous.',
      'Severity drives the colour of the operator-facing badges; confidence drives the percentage and the bar.',
    ],
  },
  {
    id: 'healing',
    step: 10,
    icon: ShieldCheck,
    title: 'Corrected value (sensor healing)',
    simple:
      'When a reading is untrustworthy, the system can estimate what the sensor should have reported, so an operator can sanity-check the fault.',
    technical: [
      'The same residual regressors used for detection are re-used to predict each sensor value from the other sensors and the engineered features.',
      'Predictions are clamped to the physical validity ranges before they are reported as a corrected value.',
      'If a sensor is missing, only that value is predicted; the others are reported as observed, and the prediction is withheld when its own inputs are unavailable.',
      'Normal readings have no corrected value — nothing is wrong, so nothing is corrected. The dashboard shows "—" rather than inventing a number.',
    ],
  },
  {
    id: 'recommendations',
    step: 11,
    icon: Wrench,
    title: 'Recommendation generation',
    simple:
      'Each anomaly type maps to a short, ordered list of operator actions with an urgency, so the next step is never a guess.',
    technical: [
      'Recommendations are looked up by anomaly type: a sudden spike suggests inspecting the housing, then recalibrating, then checking the connection; a communication error starts with the data link and antenna.',
      'Each entry carries a priority (1–3) and an urgency string such as "Immediate" or "Within 2 hours".',
      'The list is stored inside the anomaly event at detection time, so an event opened later shows exactly the actions it was raised with.',
    ],
  },
  {
    id: 'workflow',
    step: 12,
    icon: ListChecks,
    title: 'The operator workflow',
    simple:
      'Detection is only half the system. The other half is making sure a real problem is never silently forgotten — and never falsely closed.',
    technical: [
      'Every processed reading becomes a persistent record. An anomaly becomes Active; a normal reading is stored as Normal; both keep their own timestamp, reading, explanation and root-cause shares.',
      'A later normal reading never rewrites an earlier anomaly: current detection state and event lifecycle are separate concepts by design.',
      'Only an operator resolves an event, by checking it off, which calls POST /api/history/{id}/resolve and stores status Resolved with the resolution timestamp.',
      'Polling reconciles against that stored state, so a resolved event cannot flip back to Active while the dashboard is open.',
    ],
  },
];

const LIFECYCLE = [
  { label: 'Sensor reading', tone: 'border-border bg-muted/30 text-foreground' },
  { label: 'Cleaning & feature build', tone: 'border-border bg-muted/30 text-foreground' },
  {
    label: 'Rules + residuals + Isolation Forest',
    tone: 'border-primary/40 bg-primary/5 text-primary',
  },
  { label: 'Root-cause shares', tone: 'border-border bg-muted/30 text-foreground' },
  { label: 'Explanation & recommendations', tone: 'border-accent/40 bg-accent/5 text-accent' },
  { label: 'Operator resolution', tone: 'border-positive/40 bg-positive/5 text-positive' },
  { label: 'Anomaly history', tone: 'border-border bg-muted/30 text-foreground' },
];

export default function PipelineExplainer() {
  return (
    <div className="space-y-8">
      {/* Overview strip */}
      <section aria-labelledby="pipeline-overview" className="card-elevated p-5">
        <h2 id="pipeline-overview" className="text-sm font-semibold text-foreground">
          One reading, end to end
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          The order below is the order the code runs in. Rules and residual analysis are evaluated
          before the Isolation Forest, so a physically explainable fault is reported as such.
        </p>
        <ol className="mt-4 flex flex-wrap items-center gap-2">
          {LIFECYCLE.map((item, index) => (
            <React.Fragment key={item.label}>
              <li className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${item.tone}`}>
                {item.label}
              </li>
              {index < LIFECYCLE.length - 1 && (
                <li aria-hidden="true" className="text-muted-foreground">
                  →
                </li>
              )}
            </React.Fragment>
          ))}
        </ol>
      </section>

      {/* Steps */}
      <section aria-label="Pipeline steps" className="space-y-4">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            // Each step is its own reveal group, so a twelve-card walkthrough
            // animates card by card as it is scrolled rather than all at once off
            // the top of the section.
            <InView key={step.id}>
              <article id={step.id} className="card-elevated p-5">
                <div className="flex gap-4">
                  <div className="flex shrink-0 flex-col items-center gap-2">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
                      <Icon size={20} className="text-primary" />
                    </div>
                    <span className="font-tabular text-xs font-bold text-muted-foreground">
                      {String(step.step).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-foreground">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/80">
                      {step.simple}
                    </p>

                    <details className="group mt-3">
                      <summary
                        data-cursor="Technical details"
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <ArrowDown
                          size={12}
                          className="transition-transform group-open:rotate-180"
                        />
                        Technical details
                      </summary>
                      <ul className="mt-3 space-y-2 rounded-lg border border-border/60 bg-muted/20 p-4">
                        {step.technical.map((line, index) => (
                          <li
                            key={`${step.id}-technical-${index}`}
                            className="flex items-start gap-2 text-xs leading-relaxed text-foreground/80"
                          >
                            <span
                              aria-hidden="true"
                              className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary"
                            />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                </div>
              </article>
            </InView>
          );
        })}
      </section>

      {/* Honest limits */}
      <section
        aria-labelledby="pipeline-limits"
        className="card-elevated border-l-4 border-l-warning p-5"
      >
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-warning" />
          <div>
            <h2 id="pipeline-limits" className="text-sm font-semibold text-foreground">
              What this system does not claim
            </h2>
            <ul className="mt-3 space-y-2">
              {[
                'There is no second trained classifier. Root-cause shares are a heuristic weighting of detector signals and are labelled as such everywhere they appear.',
                'The Isolation Forest is not trained on live data. It is evaluated as the packaged artifact produced by the training notebooks.',
                'Gemini, when configured, only classifies anomalies the Isolation Forest has already flagged — it is not part of the detection decision, and it is skipped entirely when GEMINI_API_KEY is unset.',
                'Sensor drift is displayed as a monitored hypothesis, not as a detection the current pipeline can raise on its own.',
              ].map((limit) => (
                <li
                  key={limit}
                  className="flex items-start gap-2 text-xs leading-relaxed text-foreground/80"
                >
                  <CheckCheck size={13} className="mt-0.5 shrink-0 text-warning" />
                  <span>{limit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Model facts */}
      <section
        aria-labelledby="pipeline-facts"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {[
          { icon: Database, label: 'Artifact', value: 'skyguard_detector_v2.joblib' },
          { icon: Layers, label: 'Context window', value: '24 readings' },
          { icon: Cpu, label: 'Inference cadence', value: 'Every 3.5 s (simulator)' },
          {
            icon: Brain,
            label: 'Anomaly classes',
            value: '5 (spike, frozen, comms, multivariate, ML)',
          },
        ].map((fact) => {
          const FactIcon = fact.icon;
          return (
            <div key={fact.label} className="card-elevated p-4">
              <FactIcon size={16} className="text-accent" />
              <p className="mt-2 text-label-sm text-muted-foreground">{fact.label}</p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">{fact.value}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
