import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'  # Suppress TensorFlow oneDNN logs (optional)
import cv2
import pytesseract
import numpy as np
import google.generativeai as genai
import pickle
import pandas as pd
import json
import requests
import secrets
import re
from collections import defaultdict
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all origins for CORS

# Base directory and model paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, "medicine_model.pkl")
le_path = os.path.join(BASE_DIR, "label_encoders.pkl")

# Load the trained model and label encoders
try:
    with open(model_path, "rb") as model_file:
        model = pickle.load(model_file)
    with open(le_path, "rb") as le_file:
        label_encoders = pickle.load(le_file)
except FileNotFoundError as e:
    app.logger.error(f"Model or label encoder file not found: {e}")
    raise

# Configure Google Generative AI API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    app.logger.error("Gemini API key not set in environment variables")
    raise ValueError("GEMINI_API_KEY is required")
genai.configure(api_key=GEMINI_API_KEY)

# Folder configurations
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
ALTERNATIVES_FILE = os.path.join(DATA_FOLDER, 'drug_alternatives.json')

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
    try:
        processed_image = preprocess_image(image_path)
        custom_config = r'--oem 3 --psm 6'
        extracted_text = pytesseract.image_to_string(processed_image, config=custom_config)
        return extracted_text.strip() or "No text extracted"
    except Exception as e:
        app.logger.error(f"Error extracting text: {e}")
        return "Error extracting text"

def predict_generic_name(medicine_name):
    try:
        if medicine_name in label_encoders["MEDICINE_NAME"].classes_:
            medicine_encoded = label_encoders["MEDICINE_NAME"].transform([medicine_name])
            predicted_label = model.predict(pd.DataFrame({"MEDICINE_NAME": medicine_encoded}))
            generic_name = label_encoders["GENERIC_NAME"].inverse_transform(predicted_label)[0]
            return generic_name
        return "Unknown Medicine"
    except Exception as e:
        app.logger.error(f"Error predicting generic name: {e}")
        return "Prediction Error"

def organize_text_with_ai(text):
    try:
        model = genai.GenerativeModel("gemini-1.5-pro")
        prompt = f"""
        Organize the following prescription text into a structured format with clearly labeled sections:
        - *Patient Information* (Name, Age, Gender if available)
        - *Doctor Information* (Name, Hospital/Clinic, License Number if available)
        - *Medications* (Medicine Name, Dosage, Frequency)
        - *Special Instructions* (Dietary advice, warnings, or extra instructions)
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
    except Exception as e:
        app.logger.error(f"Error organizing text with AI: {e}")
        return {"structured_text": "Error processing text", "generic_predictions": {}}

def load_json(file_path, default=[]):
    try:
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                return json.load(f)
        return default
    except Exception as e:
        app.logger.error(f"Error loading JSON from {file_path}: {e}")
        return default

def save_json(file_path, data):
    try:
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=4)
    except Exception as e:
        app.logger.error(f"Error saving JSON to {file_path}: {e}")

# Drug alternatives functionality
def extract_drug_names(text):
    words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
    blacklist = {"take", "tablet", "for", "days", "and", "if", "the", "a", "of", "to", "patient", "should", "is"}
    potential_drugs = [word for word in words if word not in blacklist and len(word) > 3]
    return list(set(potential_drugs))

def get_rxcui(drug_name):
    url = f"https://rxnav.nlm.nih.gov/REST/rxcui.json?name={drug_name}"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            return data.get("idGroup", {}).get("rxnormId", [None])[0]
    except Exception as e:
        app.logger.error(f"Error getting RxCUI for {drug_name}: {e}")
    return None

def get_brand_names(rxcui):
    if not rxcui:
        return []
    
    url = f"https://rxnav.nlm.nih.gov/REST/rxcui/{rxcui}/related.json?tty=BN"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            concept_group = data.get("relatedGroup", {}).get("conceptGroup", [])
            brands = []
            for group in concept_group:
                concepts = group.get("conceptProperties", [])
                for concept in concepts:
                    brands.append(concept["name"])
            return brands
    except Exception as e:
        app.logger.error(f"Error getting brand names for RxCUI {rxcui}: {e}")
    return []

def fetch_alternatives(drug_names):
    result = defaultdict(list)
    for drug in drug_names:
        app.logger.info(f"Searching alternatives for: {drug}...")
        rxcui = get_rxcui(drug)
        if not rxcui:
            app.logger.warning(f"RxCUI not found for '{drug}'")
            continue
        brands = get_brand_names(rxcui)
        if brands:
            app.logger.info(f"Found {len(brands)} alternatives for '{drug}'")
            result[drug] = brands
        else:
            app.logger.warning(f"No brand names found for '{drug}'")
    return result

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({"error": "Invalid file"}), 400
    
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    try:
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

        # Find alternatives for medications
        drug_names = list(structured_data["generic_predictions"].keys())
        alternatives = fetch_alternatives(drug_names)
        
        # Save alternatives
        alternatives_data = load_json(ALTERNATIVES_FILE, {})
        alternatives_data.update(alternatives)
        save_json(ALTERNATIVES_FILE, alternatives_data)

        return jsonify({
            "filename": filename,
            "extracted_text": extracted_text,
            "structured_text": structured_data["structured_text"],
            "generic_predictions": structured_data["generic_predictions"],
            "alternatives": alternatives
        })
    except Exception as e:
        app.logger.error(f"Error processing upload: {e}")
        return jsonify({"error": "Failed to process file"}), 500

@app.route('/prescriptions', methods=['GET'])
def get_prescriptions():
    try:
        return jsonify(load_json(PRESCRIPTIONS_FILE))
    except Exception as e:
        app.logger.error(f"Error fetching prescriptions: {e}")
        return jsonify({"error": "Failed to fetch prescriptions"}), 500

@app.route('/medications', methods=['GET'])
def get_medications():
    try:
        return jsonify(load_json(MEDICATIONS_FILE))
    except Exception as e:
        app.logger.error(f"Error fetching medications: {e}")
        return jsonify({"error": "Failed to fetch medications"}), 500

@app.route('/reminders', methods=['GET'])
def get_reminders():
    try:
        return jsonify(load_json(REMINDERS_FILE))
    except Exception as e:
        app.logger.error(f"Error fetching reminders: {e}")
        return jsonify({"error": "Failed to fetch reminders"}), 500

@app.route('/reminders/<int:id>/complete', methods=['POST'])
def complete_reminder(id):
    try:
        reminders = load_json(REMINDERS_FILE)
        for reminder in reminders:
            if reminder['id'] == id:
                reminder['completed'] = True
                break
        save_json(REMINDERS_FILE, reminders)
        return jsonify({"status": "success"})
    except Exception as e:
        app.logger.error(f"Error completing reminder {id}: {e}")
        return jsonify({"error": "Failed to complete reminder"}), 500

@app.route('/generate-prescription-doc', methods=['POST'])
def generate_prescription_doc():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        patient = data.get('patient', {})
        medications = data.get('medications', [])
        prescriptions = data.get('prescriptions', [])
        timestamp = data.get('timestamp', pd.Timestamp.now().strftime('%Y-%m-%d'))

        # Generate PDF
        file_name = f"prescription_{patient.get('n', 'Unknown').replace(' ', '')}{timestamp}.pdf"
        file_path = os.path.join(app.config['DOCS_FOLDER'], file_name)
        doc = SimpleDocTemplate(file_path, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []

        # Title
        story.append(Paragraph("Emergency Medical Information", styles['Title']))
        story.append(Spacer(1, 12))

        # Patient Info
        story.append(Paragraph(f"PATIENT: {patient.get('n', 'Unknown')}", styles['Normal']))
        if patient.get('g', 'U') != 'U':
            story.append(Paragraph(f"GENDER: {patient.get('g')}", styles['Normal']))
        if patient.get('e', 'None') != 'None':
            story.append(Paragraph(f"EMERGENCY CONTACT: {patient.get('e')}", styles['Normal']))
        story.append(Spacer(1, 12))

        # Medications
        story.append(Paragraph("MEDICATIONS:", styles['Heading2']))
        for i, med in enumerate(medications, 1):
            story.append(Paragraph(f"{i}. {med.get('n', 'Unknown')}: {med.get('d', 'N/A')} ({med.get('date', 'N/A')})", styles['Normal']))
        story.append(Spacer(1, 12))

        # Prescription Details
        story.append(Paragraph("PRESCRIPTION DETAILS:", styles['Heading2']))
        for i, p in enumerate(prescriptions, 1):
            doctor = p.get('doctor', 'Unknown')
            story.append(Paragraph(f"{i}. Date: {p.get('date', 'N/A')}, Doctor: {doctor}", styles['Normal']))
            clean_text = p.get('structured_text', 'No details available').replace('', '').replace('*', '')
            story.append(Paragraph(clean_text, styles['Normal']))
            story.append(Spacer(1, 6))
        story.append(Spacer(1, 12))

        # Footer
        story.append(Paragraph(f"Generated: {timestamp}", styles['Normal']))

        doc.build(story)
        url = f"http://localhost:5000/docs/{file_name}"
        return jsonify({"url": url})
    except Exception as e:
        app.logger.error(f"Error generating prescription doc: {e}")
        return jsonify({"error": "Failed to generate document"}), 500

@app.route('/', methods=['GET'])
def home():
    return "Welcome to the Smart Health Backend!"

@app.route('/docs/<filename>', methods=['GET'])
def serve_doc(filename):
    try:
        return send_from_directory(app.config['DOCS_FOLDER'], filename)
    except Exception as e:
        app.logger.error(f"Error serving document {filename}: {e}")
        return jsonify({"error": "Document not found"}), 404

@app.route('/prescriptions/<int:id>', methods=['DELETE'])
def delete_prescription(id):
    try:
        prescriptions = load_json(PRESCRIPTIONS_FILE)
        prescriptions = [p for p in prescriptions if p['id'] != id]
        save_json(PRESCRIPTIONS_FILE, prescriptions)
        return jsonify({"status": "success", "message": f"Prescription {id} deleted"})
    except Exception as e:
        app.logger.error(f"Error deleting prescription {id}: {e}")
        return jsonify({"error": "Failed to delete prescription"}), 500

@app.route('/medications/<int:id>', methods=['DELETE'])
def delete_medication(id):
    try:
        medications = load_json(MEDICATIONS_FILE)
        medications = [m for m in medications if m['id'] != id]
        save_json(MEDICATIONS_FILE, medications)
        return jsonify({"status": "success", "message": f"Medication {id} deleted"})
    except Exception as e:
        app.logger.error(f"Error deleting medication {id}: {e}")
        return jsonify({"error": "Failed to delete medication"}), 500

@app.route('/profile', methods=['GET'])
def profile():
    try:
        return jsonify({"message": "Profile data"})
    except Exception as e:
        app.logger.error(f"Error fetching profile: {e}")
        return jsonify({"error": "Failed to fetch profile"}), 500

@app.route('/reminders/<int:id>', methods=['DELETE'])
def delete_reminder(id):
    try:
        reminders = load_json(REMINDERS_FILE)
        reminders = [r for r in reminders if r['id'] != id]
        save_json(REMINDERS_FILE, reminders)
        return jsonify({"status": "success", "message": f"Reminder {id} deleted"})
    except Exception as e:
        app.logger.error(f"Error deleting reminder {id}: {e}")
        return jsonify({"error": "Failed to delete reminder"}), 500

@app.route('/api/pharmacies', methods=['GET'])
def get_pharmacies():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    
    if not lat or not lon:
        return jsonify({"error": "Latitude and Longitude are required"}), 400
    
    try:
        GEOAPIFY_API_KEY = os.getenv("GEOAPIFY_API_KEY")
        if not GEOAPIFY_API_KEY:
            app.logger.error("Geoapify API key not set")
            return jsonify({"error": "Geoapify API key missing"}), 500

        response = requests.get("https://api.geoapify.com/v2/places", params={
            "categories": "healthcare.pharmacy",
            "filter": f"circle:{lon},{lat},50000",
            "bias": f"proximity:{lon},{lat}",
            "limit": 10,
            "apiKey": GEOAPIFY_API_KEY
        })
        
        response.raise_for_status()
        data = response.json()
        
        pharmacies = [{
            "id": pharmacy["properties"].get("place_id", f"pharm-{secrets.token_hex(4)}"),
            "name": pharmacy["properties"].get("name", "Unnamed Pharmacy"),
            "address": pharmacy["properties"].get("formatted", "Address not available")
        } for pharmacy in data.get("features", [])]
        
        return jsonify(pharmacies)
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Error fetching pharmacies: {str(e)}")
        return jsonify({"error": f"Failed to fetch pharmacy data: {str(e)}"}), 500

@app.route('/chat-gemini', methods=['POST'])
def chat_gemini():
    try:
        data = request.get_json()
        if not data or 'chat' not in data:
            return jsonify({"error": "Message is required"}), 400

        message = data['chat']
        history = data.get('history', [])

        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(message)

        bot_response = response.text.strip() if response.text else "No response from AI."

        updated_history = history + [
            {"role": "user", "parts": [{"text": message}]},
            {"role": "model", "parts": [{"text": bot_response}]}
        ]

        return jsonify({"text": bot_response, "history": updated_history})
    except Exception as e:
        app.logger.error(f"Error in chat-gemini: {str(e)}")
        return jsonify({"error": f"Failed to process chat request: {str(e)}"}), 500

@app.route('/find-alternatives', methods=['POST'])
def find_alternatives():
    try:
        data = request.get_json()
        if not data or 'drugs' not in data:
            return jsonify({"error": "Drug names are required"}), 400

        # Option 1: Use specific drug names provided in the request
        if isinstance(data['drugs'], list) and data['drugs']:
            drug_names = data['drugs']
        # Option 2: Extract from prescription text
        elif 'prescription_text' in data and data['prescription_text']:
            drug_names = extract_drug_names(data['prescription_text'])
        else:
            return jsonify({"error": "No valid drug names or prescription text provided"}), 400

        if not drug_names:
            return jsonify({"error": "No valid drug names found"}), 400

        # Find alternatives
        alternatives = fetch_alternatives(drug_names)
        
        # Save to file
        alternatives_data = load_json(ALTERNATIVES_FILE, {})
        alternatives_data.update(alternatives)
        save_json(ALTERNATIVES_FILE, alternatives_data)
        
        return jsonify({"alternatives": alternatives})
    except Exception as e:
        app.logger.error(f"Error finding alternatives: {str(e)}")
        return jsonify({"error": f"Failed to find alternatives: {str(e)}"}), 500

@app.route('/get-all-alternatives', methods=['GET'])
def get_all_alternatives():
    try:
        alternatives_data = load_json(ALTERNATIVES_FILE, {})
        return jsonify({"alternatives": alternatives_data})
    except Exception as e:
        app.logger.error(f"Error fetching alternatives: {str(e)}")
        return jsonify({"error": f"Failed to fetch alternatives: {str(e)}"}), 500

@app.route('/get-alternatives/<drug_name>', methods=['GET'])
def get_drug_alternatives(drug_name):
    try:
        alternatives_data = load_json(ALTERNATIVES_FILE, {})
        drug_alternatives = alternatives_data.get(drug_name.lower(), [])
        return jsonify({
            "drug": drug_name,
            "alternatives": drug_alternatives
        })
    except Exception as e:
        app.logger.error(f"Error fetching alternatives for {drug_name}: {str(e)}")
        return jsonify({"error": f"Failed to fetch alternatives: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)