import React, { createContext, useState, useEffect } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [prescriptionHistory, setPrescriptionHistory] = useState([]);
  const [medicationData, setMedicationData] = useState([]);
  const [reminders, setReminders] = useState([]);

  // Fetch initial data from backend on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const prescriptionsRes = await fetch('http://localhost:5000/prescriptions');
        const prescriptionsData = await prescriptionsRes.json();
        setPrescriptionHistory(prescriptionsData);

        const medicationsRes = await fetch('http://localhost:5000/medications');
        const medicationsData = await medicationsRes.json();
        setMedicationData(medicationsData);

        const remindersRes = await fetch('http://localhost:5000/reminders');
        const remindersData = await remindersRes.json();
        setReminders(remindersData);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };
    fetchInitialData();
  }, []);

  return (
    <AppContext.Provider value={{ 
      prescriptionHistory, 
      setPrescriptionHistory, 
      medicationData, 
      setMedicationData, 
      reminders, 
      setReminders 
    }}>
      {children}
    </AppContext.Provider>
  );
};