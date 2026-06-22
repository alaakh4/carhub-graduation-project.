from flask import Flask, request, jsonify
import joblib
from pathlib import Path

app = Flask(__name__)

MODEL_CANDIDATES = [
    Path(__file__).with_name("car_service_classifier.pkl"),
    Path(__file__).with_name("AI_modelv1.pkl")
]


def load_model():
    for path in MODEL_CANDIDATES:
        if path.exists():
            return joblib.load(path)
    raise FileNotFoundError("No trained classifier file was found.")


model = load_model()

# Optional: friendly label mapping
LABEL_MAP = {
    "engine_service": "Engine Service",
    "electrical_battery_service": "Electrical & Battery Service",
    "brake_service": "Brake Service",
    "tire_wheel_service": "Tire & Wheel Service",
    "ac_service": "Air Conditioning Service",
    "body_work_service": "Body Work Service"
}
print(__name__)
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "Car Service AI API is running"
    })

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json(silent=True) or {}
        text = (data.get("text") or data.get("complaint") or "").strip()

        if not text:
            return jsonify({"error": "Text is required"}), 400

        # Predict class
        predicted_class = model.predict([text])[0]

        # Predict probabilities
        probabilities = model.predict_proba([text])[0]
        classes = model.classes_

        confidence_scores = {
            cls: round(float(prob), 4)
            for cls, prob in zip(classes, probabilities)
        }

        return jsonify({
            "input_text": text,
            "predicted_class": predicted_class,
            "predicted_label": LABEL_MAP.get(predicted_class, predicted_class),
            "confidence_scores": confidence_scores
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)
