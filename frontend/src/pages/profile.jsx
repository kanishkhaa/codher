import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Calendar, 
  Transgender, 
  HeartPulse, 
  Pill, 
  AlertCircle, 
  Phone, 
  MapPin,
  ArrowLeft,
  Edit,
  FileText
} from 'lucide-react';
import Lottie from "lottie-react";
import pulseAnimation from '../lotifi/gradient.json';
import { AppContext } from "../context/AppContext";
import Sidebar from '../../components/sidebar';

const Profile = () => {
  const { userData, prescriptionHistory } = useContext(AppContext);
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  // Format date properly
  const formatDate = (dateString) => {
    if (!dateString) return "Not provided";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Calculate age from DOB
  const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Format phone number in Indian style
  const formatIndianPhoneNumber = (number) => {
    if (!number) return "Not provided";
    // Assuming number is 10 digits, format as +91 XXXXX XXXXX
    const cleanedNumber = number.replace(/\D/g, ''); // Remove non-digits
    if (cleanedNumber.length === 10) {
      return `+91 ${cleanedNumber.slice(0, 5)} ${cleanedNumber.slice(5)}`;
    }
    return number; // Return original if not 10 digits
  };

  // Handle edit button click
  const handleEdit = () => {
    navigate('/form'); // Go back to form
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex text-white">
      {/* Sidebar */}
      <Sidebar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-16'} flex items-center justify-center p-6`}>
        <div className="w-full max-w-5xl bg-[#1E293B] rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 py-6 px-8 flex justify-between items-center">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/')}
                className="mr-4 text-white hover:bg-white/10 p-2 rounded-full transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <h1 className="text-3xl font-bold text-white">Medical Profile</h1>
            </div>
            <button 
              onClick={handleEdit}
              className="flex items-center bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors"
            >
              <Edit size={18} className="mr-2" />
              Edit Profile
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-col md:flex-row">
            {/* Left side - User basics */}
            <div className="w-full md:w-1/3 bg-[#0F172A] p-8 flex flex-col items-center">
              <div className="w-40 h-40 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-6">
                <User size={80} className="text-white" />
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">{userData.fullName || "Name Not Provided"}</h2>
              
              <div className="bg-[#1E293B] rounded-xl p-4 w-full mb-4">
                <div className="flex items-center mb-3">
                  <Calendar className="text-purple-400 mr-3" size={20} />
                  <div>
                    <p className="text-gray-400 text-sm">Date of Birth</p>
                    <p className="text-white">{formatDate(userData.dob)}</p>
                    {userData.dob && (
                      <p className="text-gray-300 text-sm">{calculateAge(userData.dob)} years old</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Transgender className="text-purple-400 mr-3" size={20} />
                  <div>
                    <p className="text-gray-400 text-sm">Gender</p>
                    <p className="text-white capitalize">{userData.gender || "Not specified"}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-red-700 rounded-xl p-4 w-full mb-4">
  <h3 className="text-lg font-semibold text-white mb-3">Emergency Contact</h3>
  {userData.emergencyContactName && (
    <p className="text-red-100 mb-2">{userData.emergencyContactName}</p>
  )}
  <div className="flex items-center">
    <Phone className="text-red-200 mr-3" size={20} />
    <a 
      href={`tel:${userData.emergencyContactNumber}`} 
      className="text-white font-bold hover:text-red-100 transition-colors"
    >
                    {formatIndianPhoneNumber(userData.emergencyContactNumber)}
                  </a>
                </div>
              </div>
              
              {/* Prescription History Summary */}
              <div className="bg-[#1E293B] rounded-xl p-4 w-full">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <FileText className="text-indigo-400 mr-2" size={20} />
                  Prescription History
                </h3>
                <p className="text-gray-300 mb-2">
                  {prescriptionHistory.length > 0 
                    ? `${prescriptionHistory.length} prescription(s) on record` 
                    : "No prescription history"}
                </p>
                {prescriptionHistory.length > 0 && (
                  <button 
                    onClick={() => navigate('/prescription')}
                    className="text-sm text-indigo-400 hover:text-indigo-300"
                  >
                    View complete history →
                  </button>
                )}
              </div>
            </div>
            
            {/* Right side - Medical details */}
            <div className="w-full md:w-2/3 bg-[#1E293B] p-8">
              <div className="mb-8 relative">
                <div className="absolute right-0 top-0 w-32 h-32 opacity-20">
                  <Lottie 
                    animationData={pulseAnimation} 
                    loop={true}
                  />
                </div>
                
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <HeartPulse className="text-red-400 mr-2" size={24} />
                  Medical Conditions
                </h3>
                
                <div className="bg-[#334155] rounded-lg p-4">
                  <p className="text-gray-300">
                    {userData.medicalConditions || "No medical conditions reported"}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                    <Pill className="text-blue-400 mr-2" size={24} />
                    Current Medications
                  </h3>
                  
                  <div className="bg-[#334155] rounded-lg p-4 h-40 overflow-y-auto">
                    <p className="text-gray-300">
                      {userData.medications || "No medications reported"}
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                    <AlertCircle className="text-yellow-400 mr-2" size={24} />
                    Allergies
                  </h3>
                  
                  <div className="bg-[#334155] rounded-lg p-4 h-40 overflow-y-auto">
                    <p className="text-gray-300">
                      {userData.allergies || "No allergies reported"}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <MapPin className="text-green-400 mr-2" size={24} />
                  Preferred Pharmacy
                </h3>
                
                <div className="bg-[#334155] rounded-lg p-4">
                  <p className="text-gray-300">
                    {userData.preferredPharmacy || "No preferred pharmacy specified"}
                  </p>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-700">
                <button 
                  onClick={() => navigate('/prescription')}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-lg 
                  hover:from-purple-700 hover:to-indigo-700 transition duration-300 ease-in-out transform 
                  hover:scale-105 focus:outline-none"
                >
                  Continue to Prescription Analyzer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;