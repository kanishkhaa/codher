import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useNavigate } from 'react-router-dom';
import Landing from "../src/pages/landing";
import Form from "../src/pages/form";
import PrescriptionAnalyzer from "../src/pages/prescription_analysis";
import MedicationDashboard from "../src/pages/dashboard";
import Reminders from "./pages/reminder";
const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/form" element={<Form />} />
        <Route path="/prescription" element={<PrescriptionAnalyzer />} />
        <Route path="/dashboard" element={<MedicationDashboard />} />
        <Route path="/reminders" element={<Reminders />} />
      </Routes>
    </Router>
  );
};

export default App;