import cv2
import numpy as np
import pickle
import pandas as pd
import json
import os

# 🔹 Load trained model
with open("ml_model/medicine_model.pkl", "rb") as f:
    model, label_encoder = pickle.load(f)

# 🔹 Load CSV file for mapping
csv_path = "ml_model/training_labels.csv"  # Update this path
df = pd.read_csv(csv_path)

# 🔹 Create a dictionary to map medicine name to generic name
medicine_to_generic = dict(zip(df["MEDICINE_NAME"], df["GENERIC_NAME"]))

# 🔹 Define image size
IMG_SIZE = (128, 128)

# 🔹 Define confidence threshold
CONFIDENCE_THRESHOLD = 0.6

# 🔹 Directory for unknown images
UNKNOWN_DIR = "unknown_images"
os.makedirs(UNKNOWN_DIR, exist_ok=True)

def predict_generic_name(image_path):
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        print(f"❌ Error: Could not read image {image_path}")
        return json.dumps({"error": "Invalid image file or path."}, indent=4)

    img = cv2.resize(img, IMG_SIZE) / 255.0
    img = img.reshape(1, 128, 128, 1)
    
    # 🔹 Model prediction
    prediction = model.predict(img)
    predicted_label = np.argmax(prediction)
    confidence = np.max(prediction)  # Get the highest confidence score
    

    confidence = float(confidence)
    
    if confidence < CONFIDENCE_THRESHOLD:
        print(f"⚠️ Low confidence: {confidence:.2f}. Saving image to unknown folder.")
        unknown_path = os.path.join(UNKNOWN_DIR, os.path.basename(image_path))
        cv2.imwrite(unknown_path, cv2.imread(image_path))
        return json.dumps({
            "Predicted Medicine": "Unknown Medicine",
            "Generic Name": "Unknown",
            "Confidence": round(confidence, 2)
        }, indent=4)

    predicted_medicine = label_encoder.inverse_transform([predicted_label])[0]
    

    generic_name = medicine_to_generic.get(predicted_medicine, "Unknown Generic Name")
    
    return json.dumps({
        "Predicted Medicine": predicted_medicine,
        "Generic Name": generic_name,
        "Confidence": round(confidence, 2)
    }, indent=4)


test_image = "/home/sbragul26/dum774.png"  # Update with an actual image path
result_json = predict_generic_name(test_image)

print(result_json)
