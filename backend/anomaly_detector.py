from datetime import datetime


class AnomalyDetector:
    """Detects suspicious activities and anomalies"""

    CONFIDENCE_THRESHOLD = 45.0

    @staticmethod
    def detect(name, confidence):
        """Detect anomalies based on detection rules"""

        if name == "Unknown":
            return {
                "is_anomaly": True,
                "type": "Unknown Person",
                "severity": "High",
                "confidence": confidence
            }

        if confidence < AnomalyDetector.CONFIDENCE_THRESHOLD:
            return {
                "is_anomaly": True,
                "type": "Low Match Score",
                "severity": "Medium",
                "confidence": confidence
            }

        current_hour = datetime.now().hour

        if 0 <= current_hour <= 5:
            return {
                "is_anomaly": True,
                "type": "Late Night Entry",
                "severity": "Medium",
                "confidence": confidence
            }

        return {
            "is_anomaly": False,
            "type": "Normal",
            "severity": "Low",
            "confidence": confidence
        }