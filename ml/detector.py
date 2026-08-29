import numpy as np


def pd_isna(val):
    import pandas as pd
    return pd.isna(val)


class SkyGuardDetector:
    def __init__(self, model, features, resid_models, resid_stds, multi_predictors, multi_threshold=17.0757):
        self.model = model
        self.features = features
        self.resid_models = resid_models
        self.resid_stds = resid_stds
        self.multi_predictors = multi_predictors
        self.multi_threshold = multi_threshold

    def _predict_healed_reading(self, row):
        """All sensors present but anomalous - predict what each 'should' read."""
        healed = {}
        for target, predictors in self.multi_predictors.items():
            pred_val = self.resid_models[target].predict(
                row[predictors].values.reshape(1, -1)
            )[0]
            healed[target] = float(pred_val)
        return healed

    def _safe_heal_with_missing(self, row):
        """Only heal sensors that are actually missing; pass through sensors that are fine."""
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
                healed[target] = float(pred_val)
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
                'reason': 'Missing sensor reading',
                'raw_reading': raw_reading,
                'healed_reading': self._safe_heal_with_missing(row)
            }

        if abs(row['T2M_diff']) > 8:
            return {
                'status': 'anomaly',
                'type': 'temperature_spike',
                'severity': 'high',
                'reason': 'Temperature changed suddenly',
                'raw_reading': raw_reading,
                'healed_reading': self._predict_healed_reading(row)
            }

        if len(recent_temps) >= 6:
            if recent_temps[-6:].std() < 0.05:
                return {
                    'status': 'anomaly',
                    'type': 'temperature_frozen',
                    'severity': 'medium',
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
            return {
                'status': 'anomaly',
                'type': 'multivariate_inconsistency',
                'severity': 'medium',
                'reason': 'Sensor readings individually normal but jointly inconsistent',
                'raw_reading': raw_reading,
                'healed_reading': self._predict_healed_reading(row)
            }

        base_features = row[self.features].values
        resid_features = np.array([z_scores['T2M'], z_scores['RH2M'], z_scores['PS']])
        x = np.concatenate([base_features, resid_features]).reshape(1, -1)

        pred = self.model.predict(x)[0]

        if pred == -1:
            return {
                'status': 'anomaly',
                'type': 'ml_anomaly',
                'severity': 'medium',
                'reason': 'Unusual weather-sensor pattern detected',
                'raw_reading': raw_reading,
                'healed_reading': self._predict_healed_reading(row)
            }

        return {
            'status': 'normal',
            'type': 'normal',
            'severity': 'none',
            'reason': 'No abnormal behaviour detected',
            'raw_reading': raw_reading,
            'healed_reading': None
        }
