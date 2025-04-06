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
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

# Load the trained model and label encoders
with open(r"C:\Users\kanishkhaa\OneDrive\Desktop\codher\ml_model\medicine_model.pkl", "rb") as model_file:
    model = pickle.load(model_file)

with open(r"C:\Users\kanishkhaa\OneDrive\Desktop\codher\ml_model\label_encoders.pkl", "rb") as le_file:
    label_encoders = pickle.load(le_file)

# Configure Google Generative AI API
genai.configure(api_key="AIzaSyBZ0xQPAupZmcN6sH2Nv4pbudpimJMd_n0")

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

UPLOAD_FOLDER = "uploads"
OUTPUT_FOLDER = "output"
DATA_FOLDER = "data"
DOCS_FOLDER = "docs"
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["OUTPUT_FOLDER"] = OUTPUT_FOLDER
app.config["DATA_FOLDER"] = DATA_FOLDER
app.config["DOCS_FOLDER"] = DOCS_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)
os.makedirs(DATA_FOLDER, exist_ok=True)
os.makedirs(DOCS_FOLDER, exist_ok=True)

# File paths for persistent storage
PRESCRIPTIONS_FILE = os.path.join(DATA_FOLDER, 'prescriptions.json')
MEDICATIONS_FILE = os.path.join(DATA_FOLDER, 'medications.json')
REMINDERS_FILE = os.path.join(DATA_FOLDER, 'reminders.json')

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def preprocess_image(image_path):
    image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if image is None:
        raise ValueError(f"Could not read image: {image_path}")
    image = cv2.resize(image, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    processed = cv2.adaptiveThreshold(image, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 2)
    return processed

def extract_text(image_path):
    processed_image = preprocess_image(image_path)
    custom_config = r'--oem 3 --psm 6'
    extracted_text = pytesseract.image_to_string(processed_image, config=custom_config)
    return extracted_text.strip() or "No text extracted"

def predict_generic_name(medicine_name):
    if medicine_name in label_encoders["MEDICINE_NAME"].classes_:
        medicine_encoded = label_encoders["MEDICINE_NAME"].transform([medicine_name])
        predicted_label = model.predict(pd.DataFrame({"MEDICINE_NAME": medicine_encoded}))
        generic_name = label_encoders["GENERIC_NAME"].inverse_transform(predicted_label)[0]
        return generic_name
    return "Unknown Medicine"

def organize_text_with_ai(text):
    model = genai.GenerativeModel("gemini-1.5-pro")
    prompt = f"""
    Organize the following prescription text into a structured format with clearly labeled sections:
    - **Patient Information** (Name, Age, Gender if available)
    - **Doctor Information** (Name, Hospital/Clinic, License Number if available)
    - **Medications** (Medicine Name, Dosage, Frequency)
    - **Special Instructions** (Dietary advice, warnings, or extra instructions)
    Prescription Text: {text}
    """
    response = model.generate_content(prompt)
    structured_text = response.text.strip() if response.text else "No response from AI."
    
    extracted_medicines = []
    for line in structured_text.split('\n'):
        if "Medicine Name" in line:
            med_name = line.split("Medicine Name:")[-1].split(",")[0].strip()
            extracted_medicines.append(med_name)
    
    generic_predictions = {med: predict_generic_name(med) for med in extracted_medicines}
    return {"structured_text": structured_text, "generic_predictions": generic_predictions}

def load_json(file_path, default=[]):
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            return json.load(f)
    return default

def save_json(file_path, data):
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4)

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({"error": "Invalid file"}), 400
    
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    extracted_text = extract_text(filepath)
    structured_data = organize_text_with_ai(extracted_text)

    # Load existing data
    prescriptions = load_json(PRESCRIPTIONS_FILE)
    medications = load_json(MEDICATIONS_FILE)
    reminders = load_json(REMINDERS_FILE)

    # Update prescriptions
    new_prescription = {
        "id": len(prescriptions) + 1,
        "filename": filename,
        "date": pd.Timestamp.now().strftime('%Y-%m-%d'),
        "structured_text": structured_data["structured_text"],
        "generic_predictions": structured_data["generic_predictions"]
    }
    prescriptions.append(new_prescription)
    save_json(PRESCRIPTIONS_FILE, prescriptions)

    # Update medications
    for med_name, generic_name in structured_data["generic_predictions"].items():
        if not any(m['name'] == med_name for m in medications):
            medications.append({
                "id": len(medications) + 1,
                "name": med_name,
                "description": generic_name,
                "caution": "Take as directed",
                "sideEffects": "Consult doctor"
            })
    save_json(MEDICATIONS_FILE, medications)

    # Update reminders
    today = pd.Timestamp.now().strftime('%Y-%m-%d')
    refill_date = (pd.Timestamp.now() + pd.Timedelta(days=30)).strftime('%Y-%m-%d')
    for i, (med_name, _) in enumerate(structured_data["generic_predictions"].items()):
        reminders.append({
            "id": len(reminders) + 1 + i,
            "medication": med_name,
            "title": f"Take {med_name}",
            "date": today,
            "time": f"{8 + i}:00",
            "recurring": "daily",
            "completed": False
        })
        reminders.append({
            "id": len(reminders) + 1 + i + 100,
            "medication": med_name,
            "title": f"Refill {med_name}",
            "date": refill_date,
            "time": "09:00",
            "recurring": "none",
            "completed": False
        })
    save_json(REMINDERS_FILE, reminders)

    return jsonify({
        "filename": filename,
        "extracted_text": extracted_text,
        "structured_text": structured_data["structured_text"],
        "generic_predictions": structured_data["generic_predictions"]
    })

@app.route('/prescriptions', methods=['GET'])
def get_prescriptions():
    return jsonify(load_json(PRESCRIPTIONS_FILE))

@app.route('/medications', methods=['GET'])
def get_medications():
    return jsonify(load_json(MEDICATIONS_FILE))

@app.route('/reminders', methods=['GET'])
def get_reminders():
    return jsonify(load_json(REMINDERS_FILE))

@app.route('/reminders/<int:id>/complete', methods=['POST'])
def complete_reminder(id):
    reminders = load_json(REMINDERS_FILE)
    for reminder in reminders:
        if reminder['id'] == id:
            reminder['completed'] = True
            break
    save_json(REMINDERS_FILE, reminders)
    return jsonify({"status": "success"})

@app.route('/generate-prescription-doc', methods=['POST'])
def generate_prescription_doc():
    data = request.get_json()
    patient = data.get('patient', {})
    medications = data.get('medications', [])
    prescriptions = data.get('prescriptions', [])
    timestamp = data.get('timestamp', pd.Timestamp.now().strftime('%Y-%m-%d'))

    # Generate PDF
    file_name = f"prescription_{patient.get('n', 'Unknown').replace(' ', '_')}_{timestamp}.pdf"
    file_path = os.path.join(app.config['DOCS_FOLDER'], file_name)
    doc = SimpleDocTemplate(file_path, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    # Title
    story.append(Paragraph("Emergency Medical Information", styles['Title']))
    story.append(Spacer(1, 12))

    # Patient Info
    story.append(Paragraph(f"PATIENT: {patient.get('n', 'Unknown')}", styles['Normal']))
    if patient.get('g') != 'U':
        story.append(Paragraph(f"GENDER: {patient.get('g')}", styles['Normal']))
    if patient.get('e') != 'None':
        story.append(Paragraph(f"EMERGENCY CONTACT: {patient.get('e')}", styles['Normal']))
    story.append(Spacer(1, 12))

    # Medications
    story.append(Paragraph("MEDICATIONS:", styles['Heading2']))
    for i, med in enumerate(medications, 1):
        story.append(Paragraph(f"{i}. {med['n']}: {med['d']} ({med.get('date', 'N/A')})", styles['Normal']))
    story.append(Spacer(1, 12))

    # Prescription Details
    story.append(Paragraph("PRESCRIPTION DETAILS:", styles['Heading2']))
    for i, p in enumerate(prescriptions, 1):
        # Use .get() to handle missing 'doctor' key with a default value
        doctor = p.get('doctor', 'Unknown')
        story.append(Paragraph(f"{i}. Date: {p.get('date', 'N/A')}, Doctor: {doctor}", styles['Normal']))
        clean_text = p.get('structured_text', 'No details available').replace('**', '').replace('*', '')
        story.append(Paragraph(clean_text, styles['Normal']))
        story.append(Spacer(1, 6))
    story.append(Spacer(1, 12))

    # Footer
    story.append(Paragraph(f"Generated: {timestamp}", styles['Normal']))

    doc.build(story)
    url = f"http://localhost:5000/docs/{file_name}"
    return jsonify({"url": url})

@app.route('/docs/<filename>', methods=['GET'])
def serve_doc(filename):
    return send_from_directory(app.config['DOCS_FOLDER'], filename)
@app.route('/prescriptions/<int:id>', methods=['DELETE'])
def delete_prescription(id):
    prescriptions = load_json(PRESCRIPTIONS_FILE)
    prescriptions = [p for p in prescriptions if p['id'] != id]
    save_json(PRESCRIPTIONS_FILE, prescriptions)
    return jsonify({"status": "success", "message": f"Prescription {id} deleted"})

@app.route('/medications/<int:id>', methods=['DELETE'])
def delete_medication(id):
    medications = load_json(MEDICATIONS_FILE)
    medications = [m for m in medications if m['id'] != id]
    save_json(MEDICATIONS_FILE, medications)
    return jsonify({"status": "success", "message": f"Medication {id} deleted"})

@app.route('/reminders/<int:id>', methods=['DELETE'])
def delete_reminder(id):
    reminders = load_json(REMINDERS_FILE)
    reminders = [r for r in reminders if r['id'] != id]
    save_json(REMINDERS_FILE, reminders)
    return jsonify({"status": "success", "message": f"Reminder {id} deleted"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)