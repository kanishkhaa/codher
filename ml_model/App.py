import os
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
from math import sin, cos, sqrt, atan2, radians

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
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
MEDICATION_CACHE_FILE = os.path.join(DATA_FOLDER, 'medication_cache.json')

# Simulated drug similarity graph
DRUG_GRAPH = {
    "paracetamol": [
        {"name": "acetaminophen", "similarity": 0.95},
        {"name": "ibuprofen", "similarity": 0.70},
        {"name": "naproxen", "similarity": 0.65}
    ],
    "acetaminophen": [
        {"name": "paracetamol", "similarity": 0.95},
        {"name": "ibuprofen", "similarity": 0.68},
        {"name": "aspirin", "similarity": 0.60}
    ],
    "ibuprofen": [
        {"name": "paracetamol", "similarity": 0.70},
        {"name": "acetaminophen", "similarity": 0.68},
        {"name": "naproxen", "similarity": 0.85},
        {"name": "aspirin", "similarity": 0.75}
    ],
    "naproxen": [
        {"name": "ibuprofen", "similarity": 0.85},
        {"name": "paracetamol", "similarity": 0.65},
        {"name": "aspirin", "similarity": 0.70}
    ],
    "aspirin": [
        {"name": "ibuprofen", "similarity": 0.75},
        {"name": "acetaminophen", "similarity": 0.60},
        {"name": "naproxen", "similarity": 0.70}
    ]
}

# Load medication cache
MEDICATION_CACHE = {}

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
        if file_path == MEDICATIONS_FILE:
            global MEDICATION_CACHE
            MEDICATION_CACHE = build_medication_cache(data)
            save_json(MEDICATION_CACHE_FILE, MEDICATION_CACHE)
    except Exception as e:
        app.logger.error(f"Error saving JSON to {file_path}: {e}")

# Load cache on startup
MEDICATION_CACHE = load_json(MEDICATION_CACHE_FILE, {})

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

def build_medication_cache(medications):
    cache = {}
    for med in medications:
        med_name = med.get('name', '').lower()
        description = med.get('description', 'Unknown').lower()
        if not description or description == 'unknown':
            med_type = 'Others'
        elif 'antibiotic' in description:
            med_type = 'Antibiotics'
        elif 'pain' in description or 'nsaid' in description:
            med_type = 'Painkillers'
        elif any(keyword in description for keyword in ['cardio', 'blood pressure', 'heart', 'ace inhibitor']):
            med_type = 'Cardiovascular'
        elif any(keyword in description for keyword in ['neuro', 'brain']):
            med_type = 'Neurological'
        elif any(keyword in description for keyword in ['hormon', 'diabetes', 'biguanide']):
            med_type = 'Hormonal'
        elif any(keyword in description for keyword in ['cholesterol', 'statin']):
            med_type = 'Cholesterol'
        else:
            med_type = 'Others'
        cache[med_name] = {
            'name': med.get('name', 'Unknown'),
            'description': med.get('description', 'Unknown'),
            'type': med_type
        }
    return cache

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
                    brands.append({"name": concept["name"], "similarity": 0.9 - len(brands) * 0.05})
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

# MultiGraph class implementation
class MultiGraph:
    def __init__(self):
        self.vertices = {}  # Store vertices (user location, hospitals)
        self.edges = {}  # Store edges as adjacency list

    def add_vertex(self, id, data):
        if id not in self.vertices:
            self.vertices[id] = data
            self.edges[id] = []

    def add_edge(self, from_id, to_id, attributes):
        if from_id in self.vertices and to_id in self.vertices:
            # Ensure all required attributes are present
            required_attrs = {'distance': 'N/A', 'time': 'N/A', 'mode': 'unknown'}
            attributes = {**required_attrs, **attributes}
            self.edges[from_id].append({'to': to_id, **attributes})
            self.edges[to_id].append({'to': from_id, **attributes})  # Undirected

    def get_edges(self, vertex):
        return self.edges.get(vertex, [])

    def find_best_hospital(self, user_id, criteria='distance'):
        edges = self.get_edges(user_id)
        if not edges:
            return None
        return min(edges, key=lambda edge: edge.get(criteria, float('inf')) if isinstance(edge.get(criteria), (int, float)) else float('inf'), default=None)

    def get_paths_to_hospital(self, user_id, hospital_id):
        return [edge for edge in self.get_edges(user_id) if edge['to'] == hospital_id]

    def get_graph_data(self):
        nodes = [
            {
                'id': id,
                'name': data.get('name', id),
                'color': '#4ECDC4' if id == 'user' else '#FF6B6B',
                'size': 600 if id == 'user' else 400
            }
            for id, data in self.vertices.items()
        ]
        links = []
        seen = set()
        for from_id, edge_list in self.edges.items():
            for edge in edge_list:
                edge_id = f"{from_id}-{edge['to']}-{edge.get('mode', 'unknown')}"
                if edge_id not in seen:
                    links.append({
                        'source': from_id,
                        'target': edge['to'],
                        'color': (
                            '#45B7D1' if edge.get('mode') == 'driving' else
                            '#FF9F1C' if edge.get('mode') == 'walking' else
                            '#8675A9'
                        ),
                        'label': edge.get('mode', 'unknown'),
                        'distance': edge.get('distance', 'N/A'),
                        'time': edge.get('time', 'N/A')
                    })
                    seen.add(edge_id)
        return {'nodes': nodes, 'links': links}

def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371  # Earth's radius in km
    dLat = radians(lat2 - lat1)
    dLon = radians(lon2 - lon1)
    a = sin(dLat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dLon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c

@app.route('/dashboard', methods=['GET'])
def get_dashboard_data():
    try:
        medications = load_json(MEDICATIONS_FILE)
        reminders = load_json(REMINDERS_FILE)
        global MEDICATION_CACHE
        MEDICATION_CACHE = build_medication_cache(medications)
        save_json(MEDICATION_CACHE_FILE, MEDICATION_CACHE)
        today = pd.Timestamp.now().strftime('%Y-%m-%d')
        one_week_ago = (pd.Timestamp.now() - pd.Timedelta(days=7)).strftime('%Y-%m-%d')
        todays_medications = [
            {
                'id': r['id'],
                'name': r['medication'],
                'time': r['time'],
                'taken': r['completed'],
                'type': MEDICATION_CACHE.get(r['medication'].lower(), {}).get('type', 'Unknown')
            }
            for r in reminders
            if r['date'] == today and 'take' in r['title'].lower()
        ]
        missed_doses = [
            {
                'id': r['id'],
                'name': r['medication'],
                'date': pd.Timestamp(r['date']).strftime('%b %d'),
                'time': r['time'],
                'type': MEDICATION_CACHE.get(r['medication'].lower(), {}).get('type', 'Unknown')
            }
            for r in reminders
            if (r['date'] >= one_week_ago and
                r['date'] <= today and
                not r['completed'] and
                isinstance(r['title'], str) and
                ('take' in r['title'].lower() or 'dose' in r['title'].lower()))
        ]
        upcoming_refills = [
            {
                'name': r['medication'],
                'date': pd.Timestamp(r['date']).strftime('%b %d')
            }
            for r in reminders
            if r['recurring'] == 'none' and 'refill' in r['title'].lower()
        ]
        upcoming_refills.sort(key=lambda x: x['date'])
        next_refill_date = upcoming_refills[0]['date'] if upcoming_refills else 'N/A'
        type_counts = defaultdict(int)
        for med in MEDICATION_CACHE.values():
            type_counts[med['type']] += 1
        total_types = sum(type_counts.values())
        medication_types = [
            {
                'name': name,
                'percentage': (count / total_types * 100) if total_types else 0,
                'count': count,
                'color': (
                    '#FF6B6B' if name == 'Painkillers' else
                    '#4ECDC4' if name == 'Antibiotics' else
                    '#FF9F1C' if name == 'Hormonal' else
                    '#8675A9' if name == 'Cardiovascular' else
                    '#5D93E1' if name == 'Neurological' else
                    '#45B7D1' if name == 'Cholesterol' else
                    '#D3D3D3'
                ),
                'emoji': (
                    '🩹' if name == 'Painkillers' else
                    '💊' if name == 'Antibiotics' else
                    '🧬' if name == 'Hormonal' else
                    '❤️' if name == 'Cardiovascular' else
                    '🧠' if name == 'Neurological' else
                    '📉' if name == 'Cholesterol' else
                    '🏥'
                )
            }
            for name, count in type_counts.items()
        ]
        total_medications = len(medications)
        missed_doses_week = len(missed_doses)
        monthly_health_score = min(100, max(0, 100 - missed_doses_week * 5))
        return jsonify({
            'totalMedications': total_medications,
            'nextRefillDate': next_refill_date,
            'missedDosesWeek': missed_doses_week,
            'monthlyHealthScore': monthly_health_score,
            'medicationTypes': medication_types,
            'todaysMedications': todays_medications,
            'missedDoses': missed_doses,
            'upcomingRefills': upcoming_refills,
            'medicationCache': MEDICATION_CACHE
        })
    except Exception as e:
        app.logger.error(f"Error fetching dashboard data: {str(e)}")
        return jsonify({"error": f"Failed to fetch dashboard data: {str(e)}"}), 500

@app.route('/clear-cache', methods=['POST'])
def clear_cache():
    try:
        global MEDICATION_CACHE
        MEDICATION_CACHE = {}
        save_json(MEDICATION_CACHE_FILE, {})
        return jsonify({"status": "success", "message": "Medication cache cleared"})
    except Exception as e:
        app.logger.error(f"Error clearing cache: {str(e)}")
        return jsonify({"error": f"Failed to clear cache: {str(e)}"}), 500

@app.route('/get-drug-graph', methods=['GET'])
def get_drug_graph():
    try:
        nodes = [{"id": drug, "label": drug.capitalize()} for drug in DRUG_GRAPH.keys()]
        edges = []
        seen = set()
        for source, targets in DRUG_GRAPH.items():
            for target in targets:
                edge_id = tuple(sorted([source, target["name"]]))
                if edge_id not in seen:
                    edges.append({
                        "from": source,
                        "to": target["name"],
                        "value": target["similarity"],
                        "label": f"{target['similarity']:.2f}"
                    })
                    seen.add(edge_id)
        return jsonify({"nodes": nodes, "edges": edges})
    except Exception as e:
        app.logger.error(f"Error fetching drug graph: {str(e)}")
        return jsonify({"error": f"Failed to fetch drug graph: {str(e)}"}), 500

@app.route('/get-hospital-graph', methods=['GET'])
def get_hospital_graph():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    if not lat or not lon:
        app.logger.error("Missing latitude or longitude parameters")
        return jsonify({"error": "Latitude and Longitude are required"}), 400
    try:
        lat, lon = float(lat), float(lon)
        app.logger.info(f"Processing hospital graph for coordinates: lat={lat}, lon={lon}")
        GEOAPIFY_API_KEY = os.getenv("GEOAPIFY_API_KEY")
        if not GEOAPIFY_API_KEY:
            app.logger.error("Geoapify API key not set")
            return jsonify({"error": "Geoapify API key missing"}), 500
        response = requests.get("https://api.geoapify.com/v2/places", params={
            "categories": "healthcare.hospital",
            "filter": f"circle:{lon},{lat},50000",
            "bias": f"proximity:{lon},{lat}",
            "limit": 10,
            "apiKey": GEOAPIFY_API_KEY
        })
        response.raise_for_status()
        data = response.json()
        app.logger.info(f"Geoapify response: {len(data.get('features', []))} hospitals found")
        hospitals = [
            {
                "id": hospital["properties"].get("place_id", f"hosp-{secrets.token_hex(4)}"),
                "name": hospital["properties"].get("name", "Unnamed Hospital"),
                "address": hospital["properties"].get("formatted", "Address not available"),
                "lat": hospital["geometry"]["coordinates"][1],
                "lon": hospital["geometry"]["coordinates"][0]
            }
            for hospital in data.get("features", [])
        ]
        if not hospitals:
            app.logger.warning("No hospitals found in Geoapify response")
            return jsonify({
                "graph": {"nodes": [], "links": []},
                "hospitals": [],
                "best_hospital": None
            })
        graph = MultiGraph()
        graph.add_vertex('user', {'lat': lat, 'lng': lon, 'name': 'Your Location'})
        for hospital in hospitals:
            graph.add_vertex(hospital['id'], hospital)
            distance = calculate_distance(lat, lon, hospital['lat'], hospital['lon'])
            hospital['distance'] = round(distance, 1)
            hospital['time_driving'] = round(distance * 3)  # 3 minutes per km
            hospital['time_walking'] = round(distance * 12)  # 12 minutes per km
            # Add driving edge
            graph.add_edge('user', hospital['id'], {
                'distance': hospital['distance'],
                'time': hospital['time_driving'],
                'mode': 'driving'
            })
            # Add walking edge
            graph.add_edge('user', hospital['id'], {
                'distance': round(distance * 1.2, 1),  # Slightly longer for walking
                'time': hospital['time_walking'],
                'mode': 'walking'
            })
        graph_data = graph.get_graph_data()
        best_hospital_edge = graph.find_best_hospital('user', 'distance')
        best_hospital = None
        if best_hospital_edge:
            best_hospital_id = best_hospital_edge['to']
            best_hospital = next((h for h in hospitals if h['id'] == best_hospital_id), None)
            if best_hospital:
                best_hospital['distance'] = best_hospital_edge['distance']
                best_hospital['time'] = best_hospital_edge['time']
                best_hospital['mode'] = best_hospital_edge['mode']
        app.logger.info(f"Graph generated: {len(graph_data['nodes'])} nodes, {len(graph_data['links'])} links")
        app.logger.debug(f"Hospitals: {json.dumps(hospitals, indent=2)}")
        app.logger.debug(f"Graph data: {json.dumps(graph_data, indent=2)}")
        return jsonify({
            'graph': graph_data,
            'hospitals': hospitals,
            'best_hospital': best_hospital
        })
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Geoapify API error: {str(e)}")
        return jsonify({"error": f"Failed to fetch hospital data: {str(e)}"}), 500
    except Exception as e:
        app.logger.error(f"Error processing hospital graph: {str(e)}")
        return jsonify({"error": f"Failed to process hospital graph: {str(e)}"}), 500

@app.route('/find-alternatives', methods=['POST'])
def find_alternatives():
    try:
        data = request.get_json()
        if not data or 'drugs' not in data:
            return jsonify({"error": "Drug names are required"}), 400
        if isinstance(data['drugs'], list) and data['drugs']:
            drug_names = data['drugs']
        elif 'prescription_text' in data and data['prescription_text']:
            drug_names = extract_drug_names(data['prescription_text'])
        else:
            return jsonify({"error": "No valid drug names or prescription text provided"}), 400
        if not drug_names:
            return jsonify({"error": "No valid drug names found"}), 400
        alternatives = fetch_alternatives(drug_names)
        alternatives_data = load_json(ALTERNATIVES_FILE, {})
        alternatives_data.update(alternatives)
        save_json(ALTERNATIVES_FILE, alternatives_data)
        return jsonify({"alternatives": alternatives})
    except Exception as e:
        app.logger.error(f"Error finding alternatives: {str(e)}")
        return jsonify({"error": f"Failed to find alternatives: {str(e)}"}), 500

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
        prescriptions = load_json(PRESCRIPTIONS_FILE)
        medications = load_json(MEDICATIONS_FILE)
        reminders = load_json(REMINDERS_FILE)
        new_prescription = {
            "id": len(prescriptions) + 1,
            "filename": filename,
            "date": pd.Timestamp.now().strftime('%Y-%m-%d'),
            "structured_text": structured_data["structured_text"],
            "generic_predictions": structured_data["generic_predictions"]
        }
        prescriptions.append(new_prescription)
        save_json(PRESCRIPTIONS_FILE, prescriptions)
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
        drug_names = list(structured_data["generic_predictions"].keys())
        alternatives = fetch_alternatives(drug_names)
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

@app.route('/prescriptions/<int:id>', methods=['DELETE'])
def delete_prescription(id):
    try:
        prescriptions = load_json(PRESCRIPTIONS_FILE)
        prescription = next((p for p in prescriptions if p['id'] == id), None)
        if not prescription:
            return jsonify({"error": "Prescription not found"}), 404
        prescriptions = [p for p in prescriptions if p['id'] != id]
        save_json(PRESCRIPTIONS_FILE, prescriptions)
        # Remove associated file if it exists
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], prescription['filename'])
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({"status": "success", "message": f"Prescription {id} deleted"})
    except Exception as e:
        app.logger.error(f"Error deleting prescription {id}: {e}")
        return jsonify({"error": f"Failed to delete prescription: {str(e)}"}), 500

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
        file_name = f"prescription_{patient.get('n', 'Unknown').replace(' ', '')}_{timestamp}.pdf"
        file_path = os.path.join(app.config['DOCS_FOLDER'], file_name)
        doc = SimpleDocTemplate(file_path, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []
        story.append(Paragraph("Emergency Medical Information", styles['Title']))
        story.append(Spacer(1, 12))
        story.append(Paragraph(f"PATIENT: {patient.get('n', 'Unknown')}", styles['Normal']))
        if patient.get('g', 'U') != 'U':
            story.append(Paragraph(f"GENDER: {patient.get('g')}", styles['Normal']))
        if patient.get('e', 'None') != 'None':
            story.append(Paragraph(f"EMERGENCY CONTACT: {patient.get('e')}", styles['Normal']))
        story.append(Spacer(1, 12))
        story.append(Paragraph("MEDICATIONS:", styles['Heading2']))
        for i, med in enumerate(medications, 1):
            story.append(Paragraph(f"{i}. {med.get('n', 'Unknown')}: {med.get('d', 'N/A')} ({med.get('date', 'N/A')})", styles['Normal']))
        story.append(Spacer(1, 12))
        story.append(Paragraph("PRESCRIPTION DETAILS:", styles['Heading2']))
        for i, p in enumerate(prescriptions, 1):
            doctor = p.get('doctor', 'Unknown')
            story.append(Paragraph(f"{i}. Date: {p.get('date', 'N/A')}, Doctor: {doctor}", styles['Normal']))
            clean_text = p.get('structured_text', 'No details available').replace('', '').replace('*', '')
            story.append(Paragraph(clean_text, styles['Normal']))
            story.append(Spacer(1, 6))
        story.append(Spacer(1, 12))
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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)