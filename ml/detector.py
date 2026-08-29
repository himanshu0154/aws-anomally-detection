import numpy as np


def pd_isna(val):
    import pandas as pd
    return pd.isna(val)


def _scale_confidence(value, threshold, higher_is_worse=True):
    if higher_is_worse:
        excess = (value - threshold) / threshold
    else:
        excess = (threshold - value) / threshold
    excess = max(0.0, excess)
    confidence = 50 + 50 * min(1.0, excess)
    return round(confidence, 1)


# Physically plausible ranges - adjust if your actual data range differs
VALID_RANGES = {
    'T2M': (-60, 60),      # Celsius
    'RH2M': (0, 100),      # percent
    'PS': (850, 1100),     # hPa, sea-level-ish range
}


def _clamp(target, value):
    lo, hi = VALID_RANGES[target]
    return max(lo, min(hi, value))


class SkyGuardDetector:
    def __init__(self, model, features, resid_models, resid_stds, multi_predictors,
                 multi_threshold=17.0757, if_score_min=-0.09150155162021423, if_score_max=0.1269836965997279):
        self.model = model
        self.features = features
        self.resid_models = resid_models
        self.resid_stds = resid_stds
        self.multi_predictors = multi_predictors
        self.multi_threshold = multi_threshold
        self.if_score_min = if_score_min
        self.if_score_max = if_score_max

    def _predict_healed_reading(self, row):
        healed = {}
        for target, predictors in self.multi_predictors.items():
            pred_val = self.resid_models[target].predict(
                row[predictors].values.reshape(1, -1)
            )[0]
            healed[target] = _clamp(target, float(pred_val))
        return healed

    def _safe_heal_with_missing(self, row):
        healed = {}
        for target in ['T2M', 'RH2M', 'PS']:
            if not pd_isna(row[target]):
                healed[target] = float(row[target])
                continue
            predictors = self.multi_predictors[target]
            if row[predictors].isna().any():
                healed[target] = None
            else:
                pred_val = self.resid_models[target].predict(
                    row[predictors].values.reshape(1, -1)
                )[0]
                healed[target] = _clamp(target, float(pred_val))
        return healed

    def detect(self, row, recent_temps):
        raw_reading = {
            'T2M': None if pd_isna(row['T2M']) else float(row['T2M']),
            'RH2M': None if pd_isna(row['RH2M']) else float(row['RH2M']),
            'PS': None if pd_isna(row['PS']) else float(row['PS']),
        }

        if row[['T2M', 'RH2M', 'PS']].isna().any():
            return {
                'status': 'anomaly',
                'type': 'communication_error',
                'severity': 'high',
                'confidence': 100.0,
                'reason': 'Missing sensor reading',
                'raw_reading': raw_reading,
                'healed_reading': self._safe_heal_with_missing(row)
            }

        if abs(row['T2M_diff']) > 8:
            confidence = _scale_confidence(abs(row['T2M_diff']), 8, higher_is_worse=True)
            return {
                'status': 'anomaly',
                'type': 'temperature_spike',
                'severity': 'high',
                'confidence': confidence,
                'reason': 'Temperature changed suddenly',
                'raw_reading': raw_reading,
                'healed_reading': self._predict_healed_reading(row)
            }

        if len(recent_temps) >= 6:
            recent_std = recent_temps[-6:].std()
            if recent_std < 0.05:
                confidence = _scale_confidence(recent_std, 0.05, higher_is_worse=False)
                return {
                    'status': 'anomaly',
                    'type': 'temperature_frozen',
                    'severity': 'medium',
                    'confidence': confidence,
                    'reason': 'Temperature barely changed for 6 readings',
                    'raw_reading': raw_reading,
                    'healed_reading': self._predict_healed_reading(row)
                }

        z_scores = {}
        multi_score = 0
        for target, predictors in self.multi_predictors.items():
            pred_val = self.resid_models[target].predict(
                row[predictors].values.reshape(1, -1)
            )[0]
            z = (row[target] - pred_val) / self.resid_stds[target]
            z_scores[target] = z
            multi_score += z ** 2

        if multi_score > self.multi_threshold:
            confidence = _scale_confidence(multi_score, self.multi_threshold, higher_is_worse=True)
            return {
                'status': 'anomaly',
                'type': 'multivariate_inconsistency',
                'severity': 'medium',
                'confidence': confidence,
                'reason': 'Sensor readings individually normal but jointly inconsistent',
                'raw_reading': raw_reading,
                'healed_reading': self._predict_healed_reading(row)
            }

        base_features = row[self.features].values
        resid_features = np.array([z_scores['T2M'], z_scores['RH2M'], z_scores['PS']])
        x = np.concatenate([base_features, resid_features]).reshape(1, -1)

        pred = self.model.predict(x)[0]
        score = self.model.decision_function(x)[0]

        if pred == -1:
            if score < 0:
                confidence = 100 * (0 - score) / (0 - self.if_score_min)
                confidence = round(min(100.0, max(0.0, confidence)), 1)
            else:
                confidence = 50.0
            return {
                'status': 'anomaly',
                'type': 'ml_anomaly',
                'severity': 'medium',
                'confidence': confidence,
                'reason': 'Unusual weather-sensor pattern detected',
                'raw_reading': raw_reading,
                'healed_reading': self._predict_healed_reading(row)
            }

        return {
            'status': 'normal',
            'type': 'normal',
            'severity': 'none',
            'confidence': None,
            'reason': 'No abnormal behaviour detected',
            'raw_reading': raw_reading,
            'healed_reading': None
        }

