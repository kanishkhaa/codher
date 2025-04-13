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
  FileText,
  Shield
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
    <div className="min-h-screen bg-gradient-to-b from-[#0B1120] to-[#0F172A] flex text-white">
      {/* Sidebar */}
      <Sidebar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-16'} p-6 flex items-center justify-center`}>
        <div className="w-full max-w-5xl bg-[#1E293B]/90 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-indigo-600/20">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-600 py-6 px-8 flex justify-between items-center">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/')}
                className="mr-4 text-white hover:bg-white/20 p-2 rounded-full transition-all transform hover:scale-105"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white">Medical Profile</h1>
                <p className="text-indigo-200 text-sm">Your health information at a glance</p>
              </div>
            </div>
            <button 
              onClick={handleEdit}
              className="flex items-center bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-all shadow-lg hover:shadow-indigo-500/20 transform hover:scale-105"
            >
              <Edit size={18} className="mr-2" />
              Edit Profile
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-col md:flex-row">
            {/* Left side - User basics */}
            <div className="w-full md:w-1/3 bg-[#0F172A]/90 p-8 flex flex-col items-center relative overflow-hidden">
              {/* Decorative glowing orb */}
              <div className="absolute -bottom-20 -right-20 w-60 h-60 rounded-full bg-purple-600/10 blur-3xl"></div>
              
              <div className="relative w-40 h-40 mb-6">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 animate-pulse"></div>
                <div className="absolute inset-1 rounded-full bg-[#0F172A] flex items-center justify-center">
                  <User size={80} className="text-white" />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-2">{userData.fullName || "Name Not Provided"}</h2>
              <div className="w-16 h-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full mb-6"></div>
              
              <div className="bg-[#1E293B] rounded-xl p-5 w-full mb-4 shadow-lg border border-indigo-900/50 hover:border-indigo-500/30 transition-all">
                <div className="flex items-center mb-4">
                  <div className="bg-indigo-500/20 p-2 rounded-lg mr-3">
                    <Calendar className="text-indigo-400" size={20} />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Date of Birth</p>
                    <p className="text-white font-medium">{formatDate(userData.dob)}</p>
                    {userData.dob && (
                      <p className="text-indigo-300 text-sm">{calculateAge(userData.dob)} years old</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="bg-purple-500/20 p-2 rounded-lg mr-3">
                    <Transgender className="text-purple-400" size={20} />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Gender</p>
                    <p className="text-white font-medium capitalize">{userData.gender || "Not specified"}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-red-900/80 to-red-700/80 backdrop-blur-sm rounded-xl p-5 w-full mb-5 shadow-lg border border-red-600/30">
                <div className="flex items-center mb-2">
                  <Shield className="text-red-300 mr-2" size={18} />
                  <h3 className="text-lg font-semibold text-white">Emergency Contact</h3>
                </div>
                
                {userData.emergencyContactName && (
                  <p className="text-red-100 mb-3 text-lg font-medium">{userData.emergencyContactName}</p>
                )}
                <div className="flex items-center px-3 py-2 bg-red-950/50 rounded-lg">
                  <Phone className="text-red-300 mr-3" size={20} />
                  <a 
                    href={`tel:${userData.emergencyContactNumber}`} 
                    className="text-white font-bold hover:text-red-200 transition-colors"
                  >
                    {formatIndianPhoneNumber(userData.emergencyContactNumber)}
                  </a>
                </div>
              </div>
              
              {/* Prescription History Summary */}
              <div className="bg-[#1E293B] rounded-xl p-5 w-full shadow-lg border border-indigo-900/50 hover:border-indigo-500/30 transition-all">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <div className="bg-blue-500/20 p-2 rounded-lg mr-2">
                    <FileText className="text-blue-400" size={18} />
                  </div>
                  Prescription History
                </h3>
                <p className="text-gray-300 mb-3 pl-2 border-l-2 border-blue-500">
                  {prescriptionHistory.length > 0 
                    ? `${prescriptionHistory.length} prescription(s) on record` 
                    : "No prescription history"}
                </p>
                {prescriptionHistory.length > 0 && (
                  <button 
                    onClick={() => navigate('/prescription')}
                    className="text-sm w-full text-center py-2 px-4 rounded-lg bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition-all"
                  >
                    View complete history →
                  </button>
                )}
              </div>
            </div>
            
            {/* Right side - Medical details */}
            <div className="w-full md:w-2/3 bg-[#1E293B] p-8 relative">
              {/* Decorative elements */}
              <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-purple-600/5 blur-3xl"></div>
              <div className="absolute bottom-20 left-20 w-40 h-40 rounded-full bg-blue-600/5 blur-3xl"></div>
              
              <div className="mb-8 relative">
                <div className="absolute right-2 top-2 w-24 h-24 opacity-20 pointer-events-none">
                  <Lottie 
                    animationData={pulseAnimation} 
                    loop={true}
                  />
                </div>
                
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <div className="bg-red-500/20 p-2 rounded-lg mr-3">
                    <HeartPulse className="text-red-400" size={20} />
                  </div>
                  Medical Conditions
                </h3>
                
                <div className="bg-[#273344] rounded-lg p-5 shadow-inner border border-gray-700">
                  <p className="text-gray-300">
                    {userData.medicalConditions || "No medical conditions reported"}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                    <div className="bg-blue-500/20 p-2 rounded-lg mr-3">
                      <Pill className="text-blue-400" size={20} />
                    </div>
                    Current Medications
                  </h3>
                  
                  <div className="bg-[#273344] rounded-lg p-5 h-48 overflow-y-auto shadow-inner border border-gray-700 custom-scrollbar">
                    <p className="text-gray-300">
                      {userData.medications || "No medications reported"}
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                    <div className="bg-yellow-500/20 p-2 rounded-lg mr-3">
                      <AlertCircle className="text-yellow-400" size={20} />
                    </div>
                    Allergies
                  </h3>
                  
                  <div className="bg-[#273344] rounded-lg p-5 h-48 overflow-y-auto shadow-inner border border-gray-700 custom-scrollbar">
                    <p className="text-gray-300">
                      {userData.allergies || "No allergies reported"}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <div className="bg-green-500/20 p-2 rounded-lg mr-3">
                    <MapPin className="text-green-400" size={20} />
                  </div>
                  Preferred Pharmacy
                </h3>
                
                <div className="bg-[#273344] rounded-lg p-5 shadow-inner border border-gray-700">
                  <p className="text-gray-300">
                    {userData.preferredPharmacy || "No preferred pharmacy specified"}
                  </p>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-gray-700/50">
                <button 
                  onClick={() => navigate('/prescription')}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white font-bold rounded-lg 
                  hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 transition duration-300 ease-in-out transform 
                  hover:scale-[1.02] focus:outline-none shadow-lg shadow-purple-700/20 hover:shadow-purple-700/40"
                >
                  Continue to Prescription Analyzer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add this style for custom scrollbar */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1E293B;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3730a3;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4338ca;
        }
      `}</style>
    </div>
  );
};

export default Profile;