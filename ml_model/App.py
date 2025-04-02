import os
import cv2
import pytesseract
import numpy as np
import google.generativeai as genai
import pickle
import pandas as pd
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image

# Load the trained model and label encoders
with open("/home/sbragul26/codher/ml_model/medicine_model.pkl", "rb") as model_file:
    medicine_model = pickle.load(model_file)

with open("/home/sbragul26/codher/ml_model/label_encoders.pkl", "rb") as le_file:
    label_encoders = pickle.load(le_file)

# Configure Google Generative AI API
genai.configure(api_key="AIzaSyBZ0xQPAupZmcN6sH2Nv4pbudpimJMd_n0")

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*", "allow_headers": ["Content-Type", "Authorization"], "supports_credentials": True}})

UPLOAD_FOLDER = "uploads"
OUTPUT_FOLDER = "output"
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'pdf'}
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["OUTPUT_FOLDER"] = OUTPUT_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def preprocess_image(image_path):
    try:
        image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if image is None:
            raise ValueError(f"Could not read image: {image_path}")
        
        image = cv2.resize(image, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
        processed = cv2.adaptiveThreshold(image, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 2)
        return processed
    except Exception as e:
        print(f"Image preprocessing error: {e}")
        return None

def extract_text(image_path):
    try:
        processed_image = preprocess_image(image_path)
        if processed_image is None:
            return "Could not process image"
        
        custom_config = r'--oem 3 --psm 6'
        extracted_text = pytesseract.image_to_string(processed_image, config=custom_config)
        return extracted_text.strip() or "No text extracted"
    except Exception as e:
        return f"OCR Error: {str(e)}"

def predict_generic_name(medicine_name):
    try:
        if medicine_name in label_encoders["MEDICINE_NAME"].classes_:
            medicine_encoded = label_encoders["MEDICINE_NAME"].transform([medicine_name])
            predicted_label = medicine_model.predict(pd.DataFrame({"MEDICINE_NAME": medicine_encoded}))
            generic_name = label_encoders["GENERIC_NAME"].inverse_transform(predicted_label)[0]
            return generic_name
        else:
            return "Unknown Medicine"
    except Exception as e:
        return f"Prediction Error: {str(e)}"

def organize_text_with_ai(text):
    try:
        if not text or text.startswith("OCR Error") or text == "No text extracted":
            return "Unable to process prescription text"

        model = genai.GenerativeModel("gemini-1.5-pro")
        prompt = f"""
        Organize the following prescription text into a structured format with clearly labeled sections:
        
        - **Patient Information** (Name, Age, Gender if available)
        - **Doctor Information** (Name, Hospital/Clinic, License Number if available)
        - **Medications** (Medicine Name, Dosage, Frequency)
        - **Special Instructions** (Dietary advice, warnings, or extra instructions)
        - **Medication Details** (For each medication, provide Description, Caution, and Side Effects)
        
        Prescription Text: {text}
        """
        response = model.generate_content(prompt)
        structured_text = response.text.strip() if response.text else "No response from AI."
        
        # Extract medicine names from AI response (simple approach: split by lines)
        extracted_medicines = [line.strip() for line in structured_text.split('\n') if line and not line.startswith("-")]
        
        # Predict generic names
        generic_predictions = {med: predict_generic_name(med) for med in extracted_medicines}
        
        return {"structured_text": structured_text, "generic_predictions": generic_predictions}
    except Exception as e:
        return {"error": f"AI Processing Error: {str(e)}"}

@app.route('/upload', methods=['POST'])
def upload_file():
    print("Upload request received")
    
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        try:
            file.save(filepath)
            print(f"File saved: {filepath}")

            extracted_text = extract_text(filepath)
            print(f"Extracted Text: {extracted_text}")

            structured_data = organize_text_with_ai(extracted_text)
            print(f"Structured Data: {structured_data}")

            output_data = {
                "filename": filename,
                "extracted_text": extracted_text,
                "structured_text": structured_data["structured_text"],
                "generic_predictions": structured_data["generic_predictions"]
            }

            json_filepath = os.path.join(app.config['OUTPUT_FOLDER'], f"{filename}.json")
            with open(json_filepath, "w") as json_file:
                json.dump(output_data, json_file, indent=4)

            return jsonify(output_data)
        
        except Exception as e:
            print(f"Upload processing error: {e}")
            return jsonify({"error": str(e)}), 500

    return jsonify({"error": "File type not allowed"}), 400

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/')
def health_check():
    return jsonify({"status": "Backend is running"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
