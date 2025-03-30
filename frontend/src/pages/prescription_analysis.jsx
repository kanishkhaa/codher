import React, { useState, useRef } from 'react';
import axios from 'axios';
import Sidebar from '../../components/sidebar';
import { 
  Home, 
  FileText, 
  AlertTriangle, 
  Upload, 
  BarChart2, 
  Settings,
  Sparkles,
  Stethoscope,
  Clock
} from 'lucide-react';

const PrescriptionAnalyzer = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [processingStatus, setProcessingStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [structuredText, setStructuredText] = useState('');
  const [activeFeature, setActiveFeature] = useState('');
  const fileInputRef = useRef(null);

  const [prescriptionHistory] = useState([
    {
      id: 1,
      name: "Amoxicillin Prescription",
      date: "March 28, 2025",
      doctor: "Dr. Sarah Johnson",
      status: "Analyzed"
    },
    {
      id: 2,
      name: "Lipitor Prescription",
      date: "March 15, 2025",
      doctor: "Dr. Michael Chen",
      status: "Analyzed"
    },
    {
      id: 3,
      name: "Metformin Prescription",
      date: "February 22, 2025",
      doctor: "Dr. Emily Wilson",
      status: "Analyzed"
    }
  ]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
      setProcessingStatus('Uploading and processing...');
      setErrorMessage('');
      setExtractedText('');
      setStructuredText('');

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await axios.post('http://localhost:5000/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 30000
        });

        if (response.data.error) {
          throw new Error(response.data.error);
        }

        setExtractedText(response.data.extracted_text || 'No text extracted');
        setStructuredText(response.data.structured_text || 'Unable to structure text');
        setProcessingStatus('Processing complete');
      } catch (error) {
        console.error('Full Upload Error:', error);
        
        if (error.response) {
          setErrorMessage(`Server Error: ${error.response.data.error || 'Unknown server error'}`);
        } else if (error.request) {
          setErrorMessage('No response from server. Check your backend connection.');
        } else {
          setErrorMessage(`Request Error: ${error.message}`);
        }
        
        setProcessingStatus('Error processing prescription');
      }
    }
  };

  const features = [
    {
      icon: FileText,
      title: 'Medication Details',
      description: 'Comprehensive medication analysis',
      progress: 0,
      color: 'from-emerald-500 to-green-600',
      gradient: true
    },
    {
      icon: AlertTriangle,
      title: 'Drug Interactions',
      description: 'Advanced risk assessment',
      progress: 0,
      color: 'from-amber-500 to-orange-600',
      gradient: true
    }
  ];

  return (
    <div className="bg-gradient-to-br from-gray-900 via-slate-900 to-black text-white min-h-screen flex">
      {/* Left Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-10 transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      </div>
        
      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'} overflow-hidden`}>
        <div className="min-h-screen flex flex-col">
          {/* Fixed Header */}
          <div className="p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500 mb-2">Welcome</h1>
                <p className="text-gray-400 text-sm tracking-wide">Analyze and understand your prescriptions with ease</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search prescriptions" 
                    className="bg-gray-800/60 backdrop-blur-lg text-white px-4 py-2 rounded-full pl-10 w-64 border border-gray-700/30 focus:ring-2 focus:ring-blue-500/50 transition-all"
                  />
                  <svg className="absolute left-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button 
                  onClick={() => fileInputRef.current.click()}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-5 py-2 rounded-full hover:scale-105 transition-transform shadow-lg hover:shadow-xl"
                >
                  Upload Prescription
                </button>
              </div>
            </div>
          </div>

          {/* Content Area with Left Content and Right Sidebar */}
          <div className="flex flex-1 px-8 pb-8 overflow-hidden  -mt-10">
            {/* Left Column - Main Content */}
            <div className="flex-1 overflow-y-auto pr-6 ">
              {/* Upload Section */}
              <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-8 mb-8 border border-gray-700/30 shadow-2xl">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept=".png,.jpg,.jpeg,.pdf,.txt"
                  onChange={handleFileUpload}
                />
                <div 
                  onClick={() => fileInputRef.current.click()}
                  className="border-2 border-dashed border-gray-600 rounded-2xl p-10 text-center cursor-pointer 
                  hover:border-blue-500 transition-all duration-300 
                  hover:bg-blue-500/10 group"
                >
                  <Upload className="mx-auto w-16 h-16 text-gray-400 mb-4 group-hover:text-blue-400 transition-colors" />
                  <p className="text-gray-300 text-lg font-medium mb-2 group-hover:text-white transition-colors">
                    {processingStatus || 'Click to upload Prescription'}
                  </p>
                  <small className="text-gray-500 text-xs tracking-wider">
                    Supported: PNG, JPG, PDF, TXT (Max 10MB)
                  </small>
                </div>
                {errorMessage && (
                  <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
                    <p className="font-medium">{errorMessage}</p>
                  </div>
                )}
              </div>

              {/* Feature Sections */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                {features.map((feature, index) => (
                  <div 
                    key={index} 
                    className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 flex items-center border border-gray-700/30 shadow-xl hover:scale-[1.02] transition-transform"
                  >
                    <div className={`p-4 rounded-full mr-6 bg-gradient-to-br ${feature.color}`}>
                      <feature.icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500 mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-gray-400 text-sm tracking-wide">{feature.description}</p>
                    </div>
                    <div className="w-20 h-20 bg-gray-700/50 rounded-full flex items-center justify-center">
                      <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500">
                        {feature.progress}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Prescription History Section */}
              <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/30 shadow-xl mb-8">
                <div className="flex items-center mb-4">
                  <Clock className="w-6 h-6 mr-3 text-blue-400" />
                  <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500">
                    Prescription History
                  </h2>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Doctor</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescriptionHistory.map((prescription) => (
                        <tr 
                          key={prescription.id} 
                          className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                        >
                          <td className="py-3 px-4 text-blue-300 font-medium">{prescription.name}</td>
                          <td className="py-3 px-4 text-gray-300">{prescription.date}</td>
                          <td className="py-3 px-4 text-gray-300">{prescription.doctor}</td>
                          <td className="py-3 px-4">
                            <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-xs font-medium">
                              {prescription.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button className="bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 px-3 py-1 rounded-md text-sm transition-colors mr-2">
                              View
                            </button>
                            <button className="bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 px-3 py-1 rounded-md text-sm transition-colors">
                              Export
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Results Display */}
              {(extractedText || structuredText) && (
                <div className="mb-8 bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/30 shadow-xl">
                  <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500 mb-4">
                    Prescription Analysis Results
                  </h2>
                  
                  {extractedText && (
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-200 mb-2">Extracted Text</h3>
                      <pre className="bg-gray-700/50 p-4 rounded-lg text-gray-300 overflow-x-auto">
                        {extractedText}
                      </pre>
                    </div>
                  )}
                  
                  {structuredText && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-200 mb-2">Structured Analysis</h3>
                      <pre className="bg-gray-700/50 p-4 rounded-lg text-gray-300 overflow-x-auto">
                        {structuredText}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Sidebar - Fixed width, separate scrolling */}
            <div className="w-75 bg-gray-800/60 backdrop-blur-xl p-6 border-l border-gray-700/30 shadow-2xl flex-shrink-0 overflow-y-auto ml-10">
              <div className="space-y-6">
                {/* AI Summarization Section */}
                <div 
                  className="bg-gray-700/50 rounded-2xl p-6 cursor-pointer hover:bg-gray-600/50 transition-all duration-300 border border-gray-600/30 shadow-xl hover:scale-105"
                  onClick={() => setActiveFeature('summarize')}
                >
                  <div className="flex items-center mb-4">
                    <Sparkles className="w-10 h-10 mr-4 text-blue-400 animate-pulse" />
                    <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500">
                      AI Prescription Summary
                    </h3>
                  </div>
                  <p className="text-gray-300 mb-4 text-sm tracking-wide">
                    Unlock instant insights! Transform your prescription into a crystal-clear overview.
                  </p>
                  <button className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-full hover:scale-105 transition-transform shadow-lg">
                    Summarize Prescription
                  </button>
                </div>

                {/* Health Tips Section */}
                <div 
                  className="bg-gray-700/50 rounded-2xl p-6 cursor-pointer hover:bg-gray-600/50 transition-all duration-300 border border-gray-600/30 shadow-xl hover:scale-105"
                  onClick={() => setActiveFeature('healthtips')}
                >
                  <div className="flex items-center mb-4">
                    <Stethoscope className="w-10 h-10 mr-4 text-green-400 animate-pulse" />
                    <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
                      Wellness Insights
                    </h3>
                  </div>
                  <p className="text-gray-300 mb-4 text-sm tracking-wide">
                    Your health, decoded! Get personalized tips to complement your prescription.
                  </p>
                  <button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-full hover:scale-105 transition-transform shadow-lg">
                    Get Wellness Tips
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionAnalyzer;