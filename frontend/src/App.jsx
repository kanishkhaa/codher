import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext"; // Import the context provider
import Landing from "./pages/landing";
import Form from "./pages/form";
import PrescriptionAnalyzer from "./pages/prescription_analysis";
import MedicationDashboard from "./pages/dashboard";
import Reminders from "./pages/reminder";
import Profile from "./pages/profile";
import Help from "./pages/help";
import AppointmentsPage from "./pages/appointments";
import FloatingChatbot from "./pages/floatingchatbot"; // Import the chatbot
import Visualizations from "./pages/visualization";
const App = () => {
  return (
    <AppProvider>
      <Router>
        {/* Common layout wrapper if needed */}
        <>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/form" element={<Form />} />
            <Route path="/prescription" element={<PrescriptionAnalyzer />} />
            <Route path="/dashboard" element={<MedicationDashboard />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/help" element={<Help />} />
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/visualizations" element={<Visualizations />} />
          </Routes>

          {/* Floating Chatbot visible on all pages */}
          <FloatingChatbot />
        </>
      </Router>
    </AppProvider>
  );
};
export default App;
