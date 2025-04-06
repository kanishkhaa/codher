import React, { createContext, useState, useEffect, useContext } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [userData, setUserData] = useState({
    fullName: '',
    dob: '',
    gender: '',
    medicalConditions: '',
    medications: '',
    allergies: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    preferredPharmacy: ''
  });

  const [prescriptionHistory, setPrescriptionHistory] = useState([]);
  const [medicationData, setMedicationData] = useState([]);
  const [reminders, setReminders] = useState([]);

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
        
        try {
          const userRes = await fetch('http://localhost:5000/profile');
          const userProfileData = await userRes.json();
          if (userProfileData) {
            setUserData(userProfileData);
          }
        } catch (profileError) {
          console.log('No existing user profile found or error fetching it');
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };
    fetchInitialData();
  }, []);

  const updateUserData = async (newData) => {
    const updatedData = { ...userData, ...newData };
    setUserData(updatedData);
    
    try {
      const response = await fetch('http://localhost:5000/user-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData)
      });
      if (!response.ok) throw new Error('Failed to save user data');
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  };

  const deletePrescription = async (prescriptionId) => {
    try {
      const response = await fetch(`http://localhost:5000/prescriptions/${prescriptionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        setPrescriptionHistory(prev => prev.filter(prescription => prescription.id !== prescriptionId));
        // Update medications and reminders after deletion
        const medicationsRes = await fetch('http://localhost:5000/medications');
        const medicationsData = await medicationsRes.json();
        setMedicationData(medicationsData);

        const remindersRes = await fetch('http://localhost:5000/reminders');
        const remindersData = await remindersRes.json();
        setReminders(remindersData);
        
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete prescription from backend');
      }
    } catch (error) {
      console.error('Error deleting prescription:', error);
      return false;
    }
  };

  return (
    <AppContext.Provider value={{ 
      userData,
      updateUserData,
      prescriptionHistory, 
      setPrescriptionHistory, 
      medicationData, 
      setMedicationData, 
      reminders, 
      setReminders,
      deletePrescription
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};