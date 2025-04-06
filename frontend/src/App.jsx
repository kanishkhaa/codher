import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext"; // Import the context provider
import Landing from "./pages/landing"; // Adjusted path (assuming src/ is implied)
import Form from "./pages/form"; // Adjusted path
import PrescriptionAnalyzer from "./pages/prescription_analysis"; // Adjusted path
import MedicationDashboard from "./pages/dashboard"; // Adjusted path
import Reminders from "./pages/reminder"; // Adjusted path
import Profile from "./pages/profile";
import Help from "./pages/help"
const App = () => {
  return (
    <AppProvider> {/* Wrap the app with AppProvider to provide context */}
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/form" element={<Form />} />
          <Route path="/prescription" element={<PrescriptionAnalyzer />} />
          <Route path="/dashboard" element={<MedicationDashboard />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/profile" element={<Profile/>} />
          <Route path="/help" element={<Help/>} />
        </Routes>
      </Router>
    </AppProvider>
  );
};

export default App;