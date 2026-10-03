"""
SkyGuard AI — Gemini Anomaly Classifier

Uses Google Gemini to provide deeper AI-powered classification of anomalies
already flagged by the Isolation Forest model. When the IF model detects an
anomaly, Gemini analyzes the multi-sensor context to determine what kind of
anomaly it likely represents.

Environment variables:
    GEMINI_API_KEY       — Google AI API key
    GEMINI_MODEL         — Model name (default: gemini-2.0-flash)
    GEMINI_ENABLED       — "true" to enable, "false" to disable (default: true)
"""

import os
import json
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

# ─── Configuration ────────────────────────────────────────────────────────────

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
GEMINI_ENABLED = os.getenv("GEMINI_ENABLED", "true").lower() == "true"

# Known anomaly categories from the detection pipeline
KNOWN_CATEGORIES = [
    "temperature_spike",
    "temperature_frozen",
    "multivariate_inconsistency",
    "ml_anomaly",
    "communication_error",
]

# ─── System prompt ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are SkyGuard AI, an intelligent anomaly analysis assistant for Automatic Weather Stations (AWS).

Your job is to analyze sensor readings that have already been flagged as anomalous by an Isolation Forest anomaly detection model.

The Isolation Forest model detects whether a sensor pattern is unusual, but it does not always know what the anomaly represents. Your task is to analyze the anomalous readings, compare them with the provided known anomaly categories and contextual information, and classify the anomaly.

LANGUAGE AND EVIDENCE RULES:

- Use only claims directly supported by the provided sensor data.
- Do not exaggerate the magnitude or importance of a change.
- Do not use words such as "abrupt", "sharp", "severe", "extreme", "dramatic", "heavily", or "significant" unless the provided data explicitly supports that characterization.
- Prefer simple descriptions over detailed numerical descriptions.
- Include exact numbers only when they are necessary to explain why the anomaly was detected.
- Do not list starting and ending values unless they are important for understanding the anomaly.
- Example: say "temperature decreased noticeably" rather than listing both the previous and current temperature.
- Do not describe a pattern as unusual solely because it is an anomaly detected by Isolation Forest.
- Isolation Forest indicates that a pattern is statistically unusual; it does not prove that the change is physically extreme.
- Do not infer a weather event unless the sensor data provides strong evidence.
- Do not infer sensor failure unless the sensor pattern provides evidence for it.
- Clearly distinguish between observed facts and possible explanations.
- When evidence is limited, explicitly say that the cause cannot be determined from the available readings.

EXPLANATION STYLE:

- Write explanations for a general operator, not a data scientist.
- Keep the explanation to 1–2 short sentences.
- Clearly explain what changed and why the model flagged the reading.
- Use simple, natural language.
- Do not list multiple sensor values unless they are necessary.
- Do not repeat information that is already displayed elsewhere in the interface, such as confidence, severity, or primary affected sensor.
- Avoid technical phrases such as "statistically rare multivariate shift".
- Prefer phrases such as "the combination of sensor changes was unusual compared with recent readings."
- Do not exaggerate the severity of changes.
- Do not use dramatic words such as "sharp", "extreme", "dramatic", "heavily", or "abrupt".
- Do not claim that a sensor is faulty unless there is evidence of sensor malfunction.

POSSIBLE CAUSE RULES:

- Only provide a possible cause when there is reasonable evidence for it.
- If the data does not distinguish between environmental variation and sensor behavior, say "Cause cannot be determined from the available readings."
- Do not list multiple speculative causes.
- Do not present a possible cause as a confirmed fact.

ANALYSIS REQUIREMENTS:

1. Determine whether the anomalous reading appears to correspond to one of the known anomaly categories.
2. If it matches a known category, return that category.
3. If it does not match any known category, identify the most plausible type of anomaly based on the relationship between temperature, pressure, humidity, and recent readings.
4. Do NOT force the anomaly into a known category merely because it is the closest option.
5. If there is insufficient evidence to confidently identify the anomaly, classify it as "Unknown/Uncategorized Anomaly".
6. Consider relationships between multiple sensors rather than evaluating temperature, pressure, and humidity independently.
7. Distinguish between:
   - genuine environmental/weather anomalies
   - sensor malfunction or faulty readings
   - sudden sensor spikes/drops
   - inconsistent combinations of sensor values
   - gradual abnormal trends
   - previously unseen patterns
8. Do not claim that a specific weather event occurred unless the available sensor data provides reasonable evidence for it.
9. Provide a confidence score from 0–100 based on the available evidence.
10. Give a concise, neutral explanation based strictly on the available evidence.

RECOMMENDATION RULES:

- Recommendations must be directly related to the observed sensor behavior.
- Do not recommend investigating a specific weather event unless the data provides evidence for that event.
- Prefer practical sensor verification actions such as checking subsequent readings, comparing with nearby stations, or checking sensor calibration.




IMPORTANT:
- Never invent sensor measurements.
- Never invent a weather event as a fact.
- Never ignore the Isolation Forest result.
- If evidence is insufficient, use "Unknown/Uncategorized Anomaly".
- The confidence score must reflect uncertainty.
- Keep the explanation concise and technically grounded.

Return ONLY valid JSON in exactly this structure:
{
  "status": "Anomaly",
  "category": "category name",
  "classification": "Known" or "Unknown/Uncategorized",
  "confidence": 0,
  "severity": "Low" or "Medium" or "High",
  "explanation": "Brief explanation of why this pattern was classified this way.",
  "possible_cause": "Most likely cause or explanation.",
  "recommended_action": "Recommended action for monitoring or verification."
}"""


# ─── Gemini client (lazy init) ────────────────────────────────────────────────

_model = None


def _get_model():
    """Lazy-initialize the Gemini model."""
    global _model
    if _model is not None:
        return _model

    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set — Gemini classifier disabled")
        return None

    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        _model = genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            system_instruction=SYSTEM_PROMPT,
        )
        logger.info(f"Gemini classifier initialized: model={GEMINI_MODEL}")
        return _model
    except Exception as e:
        print(f"Gemini classification failed: {e}")
        return {
            "status": "Anomaly",
            "category": "Unknown/Uncategorized Anomaly",
            "classification": "Unknown/Uncategorized",
            "confidence": 0,
            "severity": "Medium",
            "explanation": "The anomaly was detected by the Isolation Forest model. Gemini analysis is temporarily unavailable.",
            "possible_cause": "Cause cannot be determined from the available readings.",
            "recommended_action": "Continue monitoring the sensor readings and verify the affected sensor if the anomaly persists."
        }


# ─── Classification ───────────────────────────────────────────────────────────

# Default fallback when Gemini is unavailable or fails
DEFAULT_CLASSIFICATION = {
    "status": "Anomaly",
    "category": "Unknown/Uncategorized",
    "classification": "Unknown/Uncategorized",
    "confidence": 0,
    "severity": "Medium",
    "explanation": "Gemini classifier unavailable. Using Isolation Forest detection only.",
    "possible_cause": "Unable to perform deep analysis without Gemini API.",
    "recommended_action": "Review sensor data manually.",
}


def classify_anomaly(
    reading: Dict[str, Any],
    detector_result: Dict[str, Any],
    recent_readings: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Use Gemini to classify an anomaly detected by the Isolation Forest model.

    Args:
        reading: The raw sensor reading that triggered the anomaly.
        detector_result: The Isolation Forest detection result.
        recent_readings: Recent sensor readings for context (last ~24 readings).

    Returns:
        Dict with Gemini classification, or fallback if unavailable.
    """
    model = _get_model()
    if model is None:
        return DEFAULT_CLASSIFICATION

    # Build the user prompt with actual data
    temp = reading.get("T2M")
    pressure = reading.get("PS")
    humidity = reading.get("RH2M")
    timestamp = reading.get("timestamp", "unknown")
    anomaly_score = detector_result.get("confidence")
    anomaly_type = detector_result.get("type", "unknown")

    # Format recent readings for context
    recent_context = "No recent readings available."
    if recent_readings:
        recent_lines = []
        for r in recent_readings[-12:]:  # last 12 readings
            ts = r.get("timestamp", "")
            t = r.get("T2M")
            h = r.get("RH2M")
            p = r.get("PS")
            recent_lines.append(
                f"  {ts}: T={t}°C, H={h}%, P={p}hPa"
            )
        recent_context = "\n".join(recent_lines)

    user_prompt = f"""Analyze this anomalous sensor reading from an Automatic Weather Station:

* Temperature: {temp} °C
* Atmospheric Pressure: {pressure} hPa
* Relative Humidity: {humidity} %
* Timestamp: {timestamp}
* Isolation Forest anomaly score: {anomaly_score}%
* Isolation Forest detected type: {anomaly_type}
* Known anomaly categories: {', '.join(KNOWN_CATEGORIES)}

Recent sensor readings/context:
{recent_context}

Classify this anomaly and return the JSON response."""

    try:
        response = model.generate_content(user_prompt)
        text = response.text.strip()

        # Extract JSON from response (handle markdown code blocks)
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        result = json.loads(text)

        # Validate required fields
        required_fields = [
            "status", "category", "classification", "confidence",
            "severity", "explanation", "possible_cause", "recommended_action",
        ]
        for field in required_fields:
            if field not in result:
                result[field] = DEFAULT_CLASSIFICATION[field]

        # Ensure confidence is an int 0-100
        try:
            result["confidence"] = max(0, min(100, int(result["confidence"])))
        except (ValueError, TypeError):
            result["confidence"] = 50

        return result

    except json.JSONDecodeError as e:
        logger.error(f"Gemini returned invalid JSON: {e}")
        return {
            **DEFAULT_CLASSIFICATION,
            "explanation": f"Gemini returned unparseable response. Original IF type: {anomaly_type}",
        }
    except Exception as e:
        logger.error(f"Gemini classification failed: {e}")
        return {
            **DEFAULT_CLASSIFICATION,
            "explanation": "The anomaly was detected by the Isolation Forest model. Gemini analysis is temporarily unavailable.",
        }
