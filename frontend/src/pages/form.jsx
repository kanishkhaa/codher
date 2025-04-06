import React, { useState, useContext } from 'react'; // Ensure useContext is imported
import { useNavigate } from 'react-router-dom';
import { 
  Check, 
  AlertCircle, 
  User, 
  Calendar, 
  Transgender, 
  HeartPulse, 
  Pill, 
  Syringe, 
  Phone, 
  MapPin 
} from 'lucide-react';
import Lottie from "lottie-react";
import robotAnimation from '../lotifi/robot.json';
import gradientAnimation from '../lotifi/gradient.json';
import { AppContext } from "../context/AppContext";

const Form = () => {
  // Use useContext to access AppContext values
  const { userData, updateUserData } = useContext(AppContext); 
  
  const [formData, setFormData] = useState({
    fullName: userData.fullName || '',
    dob: userData.dob || '',
    gender: userData.gender || '',
    medicalConditions: userData.medicalConditions || '',
    medications: userData.medications || '',
    allergies: userData.allergies || '',
    emergencyContactName: userData.emergencyContactName || '',
    emergencyContactNumber: userData.emergencyContactNumber || '',
    preferredPharmacy: userData.preferredPharmacy || ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full Name must be at least 2 characters';
    }

    if (!formData.dob) {
      newErrors.dob = 'Date of Birth is required';
    } else {
      const birthDate = new Date(formData.dob);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 18) {
        newErrors.dob = 'You must be 18 or older';
      }
    }

    if (!formData.emergencyContactNumber.trim()) {
      newErrors.emergencyContactNumber = 'Emergency Contact Number is required';
    } else if (!/^\d{10}$/.test(formData.emergencyContactNumber)) {
      newErrors.emergencyContactNumber = 'Invalid phone number (10 digits required)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Update the context with form data
      updateUserData(formData);
      setIsSubmitted(true);
      console.log('Form submitted:', formData);
      
      // Navigate to profile page instead of prescription
      setTimeout(() => {
        navigate('/profile');
      }, 1500);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6">
      <div className="w-full max-w-5xl bg-[#1E293B] rounded-2xl shadow-2xl overflow-hidden flex">
        {/* Robot Section with Gradient Animation */}
        <div className="w-1/2 bg-[#0F172A] flex items-center justify-center relative">
          <div className="absolute inset-0 z-0">
            <Lottie 
              animationData={gradientAnimation} 
              loop={true}
              className="w-full h-full opacity-30"
            />
          </div>
          
          <div className="absolute inset-0 opacity-50 bg-gradient-to-br from-purple-500/20 to-indigo-500/20"></div>
          
          <div className="z-10 w-full max-w-xs">
            <Lottie 
              animationData={robotAnimation} 
              loop={true} 
              className="w-[400px] h-[400px] md:w-[400px] md:h-[400px] ml-[-30px]"
            />
          </div>
        </div>

        {/* Form Section */}
        <div className="w-1/2 bg-[#1E293B] p-8 overflow-y-auto">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 py-4 px-6 rounded-t-xl mb-6">
            <h2 className="text-3xl font-bold text-white text-center">Registration Form</h2>
          </div>
          
          {isSubmitted ? (
            <div className="text-center">
              <Check className="mx-auto text-green-500 mb-4" size={72} />
              <h3 className="text-2xl font-semibold text-white mb-4">Form Submitted Successfully!</h3>
              <p className="text-gray-300">Redirecting to your profile...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div className="relative">
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Full Name"
                  className={`w-full px-4 py-3 bg-[#334155] text-white rounded-lg 
                    ${errors.fullName ? 'border-2 border-red-500' : 'border border-transparent'}`}
                />
                {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
              </div>

              {/* Date of Birth */}
              <div className="relative">
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-[#334155] text-white rounded-lg 
                    ${errors.dob ? 'border-2 border-red-500' : 'border border-transparent'}`}
                />
                {errors.dob && <p className="text-red-500 text-sm mt-1">{errors.dob}</p>}
              </div>

              {/* Gender */}
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-[#334155] text-white rounded-lg"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer-not-to-say">Prefer Not to Say</option>
              </select>

              {/* Medical Conditions */}
              <textarea
                name="medicalConditions"
                value={formData.medicalConditions}
                onChange={handleChange}
                placeholder="Existing Medical Conditions"
                className="w-full px-4 py-3 bg-[#334155] text-white rounded-lg"
                rows="2"
              />

              {/* Medications */}
              <textarea
                name="medications"
                value={formData.medications}
                onChange={handleChange}
                placeholder="Current Medications (Name & Dosage)"
                className="w-full px-4 py-3 bg-[#334155] text-white rounded-lg"
                rows="2"
              />

              {/* Allergies */}
              <input
                type="text"
                name="allergies"
                value={formData.allergies}
                onChange={handleChange}
                placeholder="Allergies (Drug/Food)"
                className="w-full px-4 py-3 bg-[#334155] text-white rounded-lg"
              />

              {/* Emergency Contact Name */}
              <input
                type="text"
                name="emergencyContactName"
                value={formData.emergencyContactName}
                onChange={handleChange}
                placeholder="Emergency Contact Name"
                className="w-full px-4 py-3 bg-[#334155] text-white rounded-lg"
              />

              {/* Emergency Contact Number */}
              <div className="relative">
                <input
                  type="tel"
                  name="emergencyContactNumber"
                  value={formData.emergencyContactNumber}
                  onChange={handleChange}
                  placeholder="Emergency Contact Number"
                  className={`w-full px-4 py-3 bg-[#334155] text-white rounded-lg 
                    ${errors.emergencyContactNumber ? 'border-2 border-red-500' : 'border border-transparent'}`}
                />
                {errors.emergencyContactNumber && <p className="text-red-500 text-sm mt-1">{errors.emergencyContactNumber}</p>}
              </div>

              {/* Preferred Pharmacy */}
              <input
                type="text"
                name="preferredPharmacy"
                value={formData.preferredPharmacy}
                onChange={handleChange}
                placeholder="Preferred Pharmacy (Optional)"
                className="w-full px-4 py-3 bg-[#334155] text-white rounded-lg"
              />

              {/* Submit Button */}
              <button 
                type="submit" 
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-lg 
                hover:from-purple-700 hover:to-indigo-700 transition duration-300 ease-in-out transform 
                hover:scale-105 focus:outline-none"
              >
                Submit Medical Information
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Form;