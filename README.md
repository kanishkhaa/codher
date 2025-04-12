
# SmartRx

SmartRx is an AI-powered health companion that simplifies and secures medication management. It allows users to analyze prescriptions, track medications, receive timely refill and appointment reminders, and access nearby hospitals or pharmacies through map-based directions. The platform ensures user safety by detecting drug interactions, providing personalized health tips, and maintaining a digital history with emergency QR access for critical situations.

---

## 🚀 Features

- AI-powered prescription analysis
- Smart medication reminders & refill alerts
- Appointment booking with nearby hospital map view
- Nearby pharmacy locator with real-time directions
- Drug interaction checker and detailed medication info
- Digital health record storage and emergency QR generation
- Smart dashboard with health tips and visual summaries

---

## 🛠️ How to Run the Project

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/smartrx.git
cd smartrx
```

---

### 2. Backend Setup (Python)

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py                  # or: uvicorn app:app --reload (if using FastAPI)
```

> Ensure the backend is running on `http://localhost:8000` or the specified port.

---

### 3. Frontend Setup (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

> Frontend will run at `http://localhost:5173` by default.

---

## ✅ Prerequisites

- Node.js (v16+)
- Python 3.8+
- pip
- npm or yarn

---

## 🌐 Access

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:5000](http://localhost:5000)

---
