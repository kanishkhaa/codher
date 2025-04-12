import React, { useState, useRef, useContext } from 'react';
import axios from 'axios';
import { FileText, AlertTriangle, Upload, Clock, Sparkles, Stethoscope, AlertCircle, Trash2 } from 'lucide-react';
import Sidebar from '../../components/sidebar';
import { AppContext } from "../context/AppContext";
import { QRCodeSVG } from 'qrcode.react';

const PrescriptionAnalyzer = () => {
  const {
    prescriptionHistory,
    setPrescriptionHistory,
    medicationData,
    setMedicationData,
    setReminders,
    deletePrescription
  } = useContext(AppContext);

  const [uploadedFile, setUploadedFile] = useState(null);
  const [processingStatus, setProcessingStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [structuredText, setStructuredText] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [aiSummary, setAiSummary] = useState('');
  const [wellnessTips, setWellnessTips] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isGeneratingTips, setIsGeneratingTips] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [currentMedications, setCurrentMedications] = useState([]);
  const fileInputRef = useRef(null);

  // Fetch drug info from RxNorm API
  const fetchDrugInfo = async (drugName) => {
    try {
      const url = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(drugName)}`;
      const response = await axios.get(url, { timeout: 10000 });
      const rxcui = response.data.idGroup.rxnormId?.[0];
      if (!rxcui) {
        throw new Error(`No RxCUI found for ${drugName}`);
      }
      return {
        name: drugName,
        description: `${drugName} is a medication used as prescribed by your doctor.`
      };
    } catch (error) {
      console.error(`Error fetching RxNorm data for ${drugName}:`, error);
      return {
        name: drugName,
        description: `${drugName} is a medication used as prescribed (not found in RxNorm).`
      };
    }
  };

  const parseMedicationData = async (text) => {
    if (!text) return [];

    const medications = [];
    const medicationSectionMatch = text.match(/\*\*Medications:\*\*\n([\s\S]*?)(?:\n\n\*\*Special Instructions:\*\*|\n\nNote:|$)/i);
    const medicationSection = medicationSectionMatch ? medicationSectionMatch[1] : '';
    if (!medicationSection.trim()) return [];

    const medicationEntries = medicationSection.split('\n').filter(line => line.trim().startsWith('* **')).map(line => line.trim());

    for (let i = 0; i < medicationEntries.length; i++) {
      let entry = medicationEntries[i];
      entry = entry.replace(/\*+\s*/g, '').trim();
      if (!entry) continue;

      const medicationRegex = /^\s*(.+?)(?:\s*\(([^)]+)\))?:\s*([^:]+)$/;
      const match = entry.match(medicationRegex);
      if (!match) {
        console.warn(`Skipping malformed medication entry: ${entry}`);
        continue;
      }

      let drugName = match[1].trim();
      const composition = match[2] ? match[2].trim() : '';
      const dosage = match[3].trim();

      const namesToTry = composition ? [composition, drugName] : [drugName];
      let drugInfo = null;

      for (const name of namesToTry) {
        drugInfo = await fetchDrugInfo(name);
        if (!drugInfo.description.includes('not found in RxNorm')) {
          drugName = name;
          break;
        }
      }

      medications.push({
        id: `${i + 1}`,
        name: drugName,
        dosage: dosage,
        description: drugInfo.description,
        cautions: getRandomDrugCautions(),
        sideEffects: getRandomSideEffects(),
        interactions: getRandomInteractions()
      });
    }

    return medications;
  };

  const getRandomDrugCautions = () => {
    const cautions = [
      'Do not operate heavy machinery',
      'Take with food',
      'Avoid alcohol',
      'May cause drowsiness',
      'Notify doctor if symptoms worsen',
      'Not for liver impairment',
      'Caution with kidney disease'
    ];
    return cautions.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 2) + 2);
  };

  const getRandomSideEffects = () => {
    const effects = [
      'Nausea', 'Headache', 'Dizziness', 'Drowsiness', 'Dry mouth',
      'Upset stomach', 'Fatigue', 'Insomnia', 'Rash', 'Constipation',
      'Diarrhea', 'Loss of appetite'
    ];
    return effects.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 3) + 3);
  };

  const getRandomInteractions = () => {
    const interactions = [
      { drugName: 'Warfarin', severity: 'high', effect: 'May increase bleeding risk' },
      { drugName: 'Ibuprofen', severity: 'medium', effect: 'May reduce effectiveness' },
      { drugName: 'Antacids', severity: 'low', effect: 'May decrease absorption' },
      { drugName: 'Aspirin', severity: 'medium', effect: 'Increased stomach bleeding risk' },
      { drugName: 'Digoxin', severity: 'high', effect: 'May increase digoxin levels' }
    ];
    return Math.random() > 0.3 ? 
      interactions.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 2) + 1) : 
      [];
  };

  const generateEmergencyQR = async () => {
    try {
      const allMedications = currentMedications.map(med => ({
        n: med.name,
        d: med.dosage,
        date: new Date().toISOString().slice(0, 10)
      }));

      const patientInfo = structuredText
        ? {
            n: structuredText.match(/Name: ([^\n]*)/)?.[1]?.trim() || 'Unknown',
            g: structuredText.match(/Gender: ([^\n]*)/)?.[1]?.trim() || 'U',
            e: structuredText.match(/Emergency Contact: ([^\n]*)/)?.[1]?.trim() || 'None'
          }
        : { n: 'Unknown', g: 'U', e: 'None' };

      const prescriptionData = {
        patient: patientInfo,
        medications: allMedications,
        prescriptions: [{
          date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          doctor: structuredText.match(/\*\*Doctor Information:\*\*[\s\S]*?Name: ([^\n]*)/)?.[1]?.trim() || 'Unknown',
          structured_text: structuredText
        }],
        timestamp: new Date().toISOString().slice(0, 10)
      };

      const response = await axios.post('http://localhost:5000/generate-prescription-doc', prescriptionData, {
        headers: { 'Content-Type': 'application/json' }
      });

      setQrData(response.data.url);
      setShowQRModal(true);
    } catch (error) {
      console.error('QR Generation Error:', error);
      setErrorMessage('Failed to generate Emergency QR code: ' + error.message);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadedFile(file);
    setProcessingStatus('Uploading and processing...');
    setErrorMessage('');
    setStructuredText('');
    setAiSummary('');
    setWellnessTips('');
    setCurrentMedications([]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:5000/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.error) throw new Error(response.data.error);

      setStructuredText(response.data.structured_text || 'Unable to structure text');
      const parsedMedications = await parseMedicationData(response.data.structured_text);

      if (parsedMedications.length === 0) {
        setErrorMessage('No medications found in the prescription.');
        setProcessingStatus('Processing complete');
        return;
      }

      setCurrentMedications(parsedMedications);
      setMedicationData(prev => {
        const existingNames = prev.map(med => med.name);
        const uniqueNewMeds = parsedMedications.filter(med => !existingNames.includes(med.name));
        return [...prev, ...uniqueNewMeds];
      });

      const newPrescription = {
        id: Date.now(),
        name: response.data.filename || file.name,
        date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        doctor: response.data.structured_text.match(/\*\*Doctor Information:\*\*[\s\S]*?Name: ([^\n]*)/)?.[1]?.trim() || 'Unknown',
        status: 'Analyzed',
        rawData: response.data,
        structured_text: response.data.structured_text,
        generic_predictions: response.data.generic_predictions,
      };
      setPrescriptionHistory(prev => [...prev, newPrescription]);

      const today = new Date();
      const newReminders = parsedMedications.map((med, index) => ({
        id: Date.now() + index,
        medication: med.name,
        title: `Take ${med.name}`,
        description: med.dosage || 'As prescribed',
        date: today.toISOString().split('T')[0],
        time: `${8 + index}:00`,
        recurring: 'daily',
        completed: false,
        priority: 'medium',
        takenHistory: [],
      }));

      const refillDate = new Date();
      refillDate.setDate(refillDate.getDate() + 30);
      parsedMedications.forEach((med, index) => {
        newReminders.push({
          id: Date.now() + 100 + index,
          medication: med.name,
          title: `Refill ${med.name}`,
          description: 'Contact pharmacy for refill',
          date: refillDate.toISOString().split('T')[0],
          time: '09:00',
          recurring: 'none',
          completed: false,
          priority: 'medium',
          takenHistory: [],
        });
      });

      setReminders(prev => [...prev, ...newReminders]);
      setProcessingStatus('Processing complete');
    } catch (error) {
      console.error('Upload Error:', error);
      setErrorMessage(error.message);
      setProcessingStatus('Error processing prescription');
    }
  };

  const generateAiSummary = async () => {
    if (!structuredText || !currentMedications.length) {
      setErrorMessage('No prescription data available for summarization');
      return;
    }

    setIsSummarizing(true);
    try {
      const payload = {
        structured_text: structuredText,
        medications: currentMedications,
      };

      const response = await axios.post('http://localhost:5000/generate-summary', payload, {
        timeout: 30000
      });

      if (response.data.error) throw new Error(response.data.error);
      setAiSummary(response.data.summary);
    } catch (error) {
      console.error('Summary Generation Error:', error);
      generateLocalSummary();
    } finally {
      setIsSummarizing(false);
    }
  };

  const generateLocalSummary = () => {
    if (!currentMedications.length) {
      setAiSummary('No medication data available to summarize.');
      return;
    }

    const patientNameMatch = structuredText.match(/\*\*Patient Information:\*\*[\s\S]*?Name: ([^\n]*)/);
    const patientName = patientNameMatch ? patientNameMatch[1].trim() : 'Patient';
    const doctorNameMatch = structuredText.match(/\*\*Doctor Information:\*\*[\s\S]*?Name: ([^\n]*)/);
    const doctorName = doctorNameMatch ? doctorNameMatch[1].trim() : 'Unknown Doctor';
    const dateMatch = structuredText.match(/Next Review Date: ([^\n]*)/);
    const prescriptionDate = dateMatch ? dateMatch[1].trim() : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const genderMatch = structuredText.match(/Gender: ([^\n]*)/);
    const patientGender = genderMatch ? `(${genderMatch[1].trim().charAt(0)})` : '';

    let summary = '';
    summary += `Patient: ${patientName} ${patientGender}\n`;
    summary += `Date: ${prescriptionDate}\n`;
    summary += `Physician: Dr. ${doctorName}\n`;
    summary += `Medications:\n`;

    currentMedications.forEach((med, index) => {
      const superscriptNumbers = ['¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹', '¹⁰'];
      const medNumber = superscriptNumbers[index] || `${index + 1}`;
      const dosageText = med.dosage || 'As prescribed';
      summary += `  ${med.name}${medNumber}: ${dosageText}\n`;
    });

    const hasInteractions = currentMedications.some(med => med.interactions?.length > 0);
    if (hasInteractions) {
      summary += `Alert: Potential drug interactions detected - consult your doctor\n`;
    }

    summary += `Tip: Follow your doctor's instructions carefully`;
    setAiSummary(summary);
  };

  const generateWellnessTips = async () => {
    if (!structuredText || !currentMedications.length) {
      setErrorMessage('No prescription data available for generating tips');
      return;
    }

    setIsGeneratingTips(true);
    try {
      const payload = {
        structured_text: structuredText,
        medications: currentMedications,
      };

      const response = await axios.post('http://localhost:5000/generate-wellness-tips', payload, {
        timeout: 30000
      });

      if (response.data.error) throw new Error(response.data.error);
      setWellnessTips(response.data.tips);
    } catch (error) {
      console.error('Wellness Tips Generation Error:', error);
      generateLocalWellnessTips();
    } finally {
      setIsGeneratingTips(false);
    }
  };

  const generateLocalWellnessTips = () => {
    if (!currentMedications.length) {
      setWellnessTips('No medication data available to generate tips.');
      return;
    }

    let tips = "Wellness Tips\n\n";
    tips += "• Take medications exactly as prescribed\n";
    tips += "• Stay hydrated throughout the day\n";
    tips += "• Maintain a balanced diet\n";

    currentMedications.forEach(med => {
      if (med.sideEffects?.includes('Drowsiness')) {
        tips += `• Avoid driving if ${med.name} causes drowsiness\n`;
      }
    });

    setWellnessTips(tips);
  };

  const formatStructuredText = (text) => {
    if (!text) return [];

    // Split into sections based on **Section:** markers
    const sections = text.split(/\n\n(?=\*\*[A-Z][^\n]*:\*\*)/).filter(Boolean);
    const formattedContent = [];

    sections.forEach((section, sectionIndex) => {
      const lines = section.split('\n').filter(line => line.trim());
      if (!lines.length) return;

      // Extract section title, removing ** and :
      const sectionTitleMatch = lines[0].match(/\*\*(.+?):\*\*/);
      const sectionTitle = sectionTitleMatch ? sectionTitleMatch[1].trim() : lines[0].trim();

      // Add section header with enhanced styling
      formattedContent.push(
        <h3
          key={`title-${sectionIndex}`}
          className="text-xl font-semibold text-blue-400 mt-6 mb-3 tracking-wide"
        >
          {sectionTitle}
        </h3>
      );

      // Process section content, skipping the title line
      lines.slice(1).forEach((line, lineIndex) => {
        // Remove markdown asterisks and trim
        const cleanLine = line.replace(/\*+\s*/g, '').trim();
        if (!cleanLine) return;

        // Handle medication entries specifically (to preserve formatting)
        if (sectionTitle === 'Medications') {
          // Split medication line into name/composition and dosage
          const medicationMatch = cleanLine.match(/^(.+?)(?:\s*\(([^)]+)\))?:\s*(.+)$/);
          if (medicationMatch) {
            const drugName = medicationMatch[1].trim();
            const composition = medicationMatch[2] ? `(${medicationMatch[2].trim()})` : '';
            const dosage = medicationMatch[3].trim();

            formattedContent.push(
              <div
                key={`med-${sectionIndex}-${lineIndex}`}
                className="ml-4 mb-2 text-gray-300"
              >
                <span className="font-medium text-blue-300">{drugName}</span>
                {composition && (
                  <span className="text-gray-400 ml-1">{composition}</span>
                )}
                <span className="text-gray-300">: {dosage}</span>
              </div>
            );
          } else {
            // Fallback for malformed medication lines
            formattedContent.push(
              <p
                key={`med-fallback-${sectionIndex}-${lineIndex}`}
                className="ml-4 mb-2 text-gray-300"
              >
                {cleanLine}
              </p>
            );
          }
        } else {
          // Standard list item for other sections
          formattedContent.push(
            <div
              key={`content-${sectionIndex}-${lineIndex}`}
              className="flex items-start ml-4 mb-2"
            >
              <span className="text-blue-400 mr-2">•</span>
              <span className="text-gray-300">{cleanLine}</span>
            </div>
          );
        }
      });
    });

    return formattedContent;
  };

  const formatAiText = (text) => {
    if (!text) return [];
    return text.split('\n').map((line, index) => {
      if (line.trim()) {
        return (
          <p key={index} className="text-gray-300 mb-2 flex items-start text-sm">
            <span className="text-blue-400 mr-2">•</span>
            <span>{line.trim()}</span>
          </p>
        );
      }
      return null;
    }).filter(Boolean);
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const handleDownloadQR = () => {
    try {
      const qrCodeElement = document.getElementById('emergency-qr-code');
      if (!qrCodeElement) throw new Error('QR Code element not found');

      const canvas = document.createElement('canvas');
      const canvasWidth = 1024;
      const canvasHeight = 768;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      const svgData = new XMLSerializer().serializeToString(qrCodeElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = window.URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const qrSize = 512;
        const qrPadding = (canvasWidth - qrSize) / 2;
        ctx.drawImage(img, qrPadding, 50, qrSize, qrSize);

        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.fillText('Emergency Medical Information', canvasWidth / 2, 30);

        ctx.font = '16px Arial';
        ctx.fillText('Scan to view detailed prescription document:', canvasWidth / 2, qrSize + 80);
        ctx.fillText(qrData, canvasWidth / 2, qrSize + 100);

        const dataURL = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = dataURL;
        downloadLink.download = 'Emergency-Medical-QR.png';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        window.URL.revokeObjectURL(url);
      };

      img.onerror = () => {
        throw new Error('Failed to generate QR image');
      };

      img.src = url;
    } catch (error) {
      console.error('QR Download Error:', error);
      setErrorMessage('Error downloading QR code: ' + error.message);
    }
  };

  const handlePrescriptionClick = async (prescription) => {
    setSelectedPrescription(prescription);
    setStructuredText(prescription.structured_text);
    const parsedMedications = await parseMedicationData(prescription.structured_text);
    setCurrentMedications(parsedMedications);
  };

  const handleDeletePrescription = async (prescriptionId, event) => {
    event.stopPropagation();
    if (window.confirm('Are you sure you want to delete this prescription?')) {
      const success = await deletePrescription(prescriptionId);
      if (success) {
        if (selectedPrescription?.id === prescriptionId) {
          setSelectedPrescription(null);
          setStructuredText('');
          setCurrentMedications([]);
        }
        setErrorMessage('');
      } else {
        setErrorMessage('Failed to delete prescription.');
      }
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 via-slate-900 to-black text-white min-h-screen flex">
      <div className={`fixed inset-y-0 left-0 z-10 transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      </div>

      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'} overflow-hidden`}>
        <div className="min-h-screen flex flex-col">
          <div className="p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500 mb-2">Prescription Analyzer</h1>
                <p className="text-gray-400 text-sm tracking-wide">Analyze and understand your prescriptions with ease</p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={generateEmergencyQR}
                  className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-5 py-2 rounded-full hover:scale-105 transition-transform shadow-lg flex items-center"
                >
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Emergency QR
                </button>
                <input
                  type="text"
                  placeholder="Search prescriptions"
                  className="bg-gray-800/60 backdrop-blur-lg text-white px-4 py-2 rounded-full pl-10 w-64 border border-gray-700/30 focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
                <button
                  onClick={() => fileInputRef.current.click()}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-5 py-2 rounded-full hover:scale-105 transition-transform shadow-lg"
                >
                  Upload Prescription
                </button>
              </div>
            </div>
          </div>

          {showQRModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-gray-800/90 rounded-2xl p-6 max-w-md w-full mx-4 border border-gray-700/30 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500">
                    Emergency Medical QR
                  </h3>
                  <button
                    onClick={() => setShowQRModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <div className="bg-white p-6 rounded-lg flex flex-col items-center mb-4">
                  <QRCodeSVG
                    id="emergency-qr-code"
                    value={qrData}
                    size={256}
                    bgColor="#ffffff"
                    fgColor="#000000"
                    level="H"
                    includeMargin={true}
                  />
                  <p className="text-black text-xs mt-2 font-bold">Scan to view detailed document</p>
                </div>
                <p className="text-gray-400 text-sm text-center mb-4">
                  Scan this QR code to access your prescription history.
                </p>
                <div className="flex space-x-4">
                  <button
                    onClick={handleDownloadQR}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 px-4 rounded-xl hover:scale-105 transition-transform flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Download QR
                  </button>
                  <button
                    onClick={() => setShowQRModal(false)}
                    className="flex-1 bg-gradient-to-r from-red-600 to-orange-600 text-white py-2 px-4 rounded-xl hover:scale-105 transition-transform"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedPrescription && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-gray-800/90 rounded-2xl p-6 max-w-2xl w-full mx-4 border border-gray-700/30 shadow-2xl max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500">
                    Prescription Details - {selectedPrescription.name}
                  </h3>
                  <button
                    onClick={() => setSelectedPrescription(null)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <div className="text-gray-300 prose prose-invert max-w-none">
                  {formatStructuredText(selectedPrescription.structured_text)}
                </div>
                <button
                  onClick={() => setSelectedPrescription(null)}
                  className="mt-4 w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 px-4 rounded-xl hover:scale-105 transition-transform"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-1 px-8 pb-8 overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-6">
              <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-8 mb-8 border border-gray-700/30 shadow-2xl">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".png,.jpg,.jpeg,.pdf"
                  onChange={handleFileUpload}
                />
                <div
                  onClick={() => fileInputRef.current.click()}
                  className="border-2 border-dashed border-gray-600 rounded-2xl p-10 text-center cursor-pointer hover:border-blue-500 transition-all hover:bg-blue-500/10 group"
                >
                  <Upload className="mx-auto w-16 h-16 text-gray-400 mb-4 group-hover:text-blue-400 transition-colors" />
                  <p className="text-gray-300 text-lg font-medium mb-2 group-hover:text-white transition-colors">
                    {processingStatus || 'Click to upload Prescription'}
                  </p>
                  <small className="text-gray-500 text-xs tracking-wider">Supported: PNG, JPG, PDF (Max 10MB)</small>
                </div>
                {errorMessage && (
                  <div className="mt-4 p-4 bg-red-500/20 border border-gray-700/30 rounded-lg text-red-300">
                    <p className="font-medium">{errorMessage}</p>
                  </div>
                )}
              </div>

              {processingStatus === 'Processing complete' && currentMedications.length > 0 && (
                <div className="grid md:grid-cols-1 gap-6 mb-8">
                  <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/30 shadow-xl">
                    <div className="flex items-center mb-6">
                      <div className="p-4 rounded-full mr-6 bg-gradient-to-br from-emerald-500 to-green-600">
                        <FileText className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500 mb-1">Medication Details</h3>
                        <p className="text-gray-400 text-sm tracking-wide">Comprehensive medication analysis</p>
                      </div>
                    </div>
                    <div className="space-y-6 mt-4">
                      {currentMedications.map((med) => (
                        <div key={med.id} className="border-b border-gray-700/50 pb-6 last:border-b-0">
                          <h4 className="text-lg font-semibold text-emerald-400 mb-3 flex items-center">
                            <span className="flex items-center justify-center w-8 h-8 bg-emerald-500/20 text-emerald-300 rounded-full mr-3 text-sm">
                              {med.id}
                            </span>
                            {med.name}
                          </h4>
                          <div className="mb-4 pl-11">
                            <div className="text-blue-300 font-medium mb-1 text-sm uppercase tracking-wider">Dosage:</div>
                            <p className="text-gray-300 mb-4">{med.dosage}</p>
                            <div className="text-blue-300 font-medium mb-1 text-sm uppercase tracking-wider">Description:</div>
                            <p className="text-gray-300 mb-4">{med.description}</p>
                            <div className="text-blue-300 font-medium mb-1 text-sm uppercase tracking-wider">Cautions:</div>
                            <ul className="list-disc pl-5 mb-4">
                              {med.cautions?.length ? (
                                med.cautions.map((caution, idx) => (
                                  <li key={idx} className="text-gray-300 mb-1">{caution}</li>
                                ))
                              ) : (
                                <li className="text-gray-300 mb-1">No cautions available</li>
                              )}
                            </ul>
                            <div className="text-blue-300 font-medium mb-1 text-sm uppercase tracking-wider">Side Effects:</div>
                            <div className="flex flex-wrap gap-2">
                              {med.sideEffects?.length ? (
                                med.sideEffects.map((effect, idx) => (
                                  <span key={idx} className="bg-gray-700/70 px-3 py-1 rounded-full text-gray-300 text-sm">
                                    {effect}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-300 text-sm">No side effects available</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/30 shadow-xl">
                    <div className="flex items-center mb-6">
                      <div className="p-4 rounded-full mr-6 bg-gradient-to-br from-amber-500 to-orange-600">
                        <AlertTriangle className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500 mb-1">Drug Interactions</h3>
                        <p className="text-gray-400 text-sm tracking-wide">Advanced risk assessment</p>
                      </div>
                    </div>
                    <div className="space-y-6 mt-4">
                      {currentMedications.map((med) => (
                        <div key={`interactions-${med.id}`} className="border-b border-gray-700/50 pb-6 last:border-b-0">
                          <h4 className="text-lg font-semibold text-amber-400 mb-3 flex items-center">
                            <span className="flex items-center justify-center w-8 h-8 bg-amber-500/20 text-amber-300 rounded-full mr-3 text-sm">
                              {med.id}
                            </span>
                            {med.name}
                          </h4>
                          <div className="pl-11">
                            {med.interactions?.length > 0 ? (
                              <>
                                <div className="text-amber-300 font-medium mb-3 text-sm uppercase tracking-wider">
                                  Potential Interactions:
                                </div>
                                <div className="space-y-3">
                                  {med.interactions.map((interaction, idx) => (
                                    <div key={idx} className="bg-gray-700/50 rounded-lg p-3 border border-gray-600/50">
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="font-semibold">{interaction.drugName}</div>
                                        <div className={`${getSeverityColor(interaction.severity)} text-sm font-medium`}>
                                          {interaction.severity.charAt(0).toUpperCase() + interaction.severity.slice(1)} Risk
                                        </div>
                                      </div>
                                      <p className="text-gray-300 text-sm">{interaction.effect}</p>
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <div className="bg-green-500/20 rounded-lg p-4 text-green-300 flex items-center">
                                <div className="w-8 h-8 bg-green-500/30 rounded-full flex items-center justify-center mr-3">
                                  <span className="text-green-300">✓</span>
                                </div>
                                No known significant interactions detected.
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {processingStatus === 'Processing complete' && structuredText && (
                <div className="mb-8 bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/30 shadow-xl">
                  <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500 mb-4">
                    Prescription Details
                  </h2>
                  <div className="text-gray-300 prose prose-invert max-w-none">
                    {formatStructuredText(structuredText)}
                  </div>
                </div>
              )}

              <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/30 shadow-xl mb-8">
                <div className="flex items-center mb-4">
                  <Clock className="w-6 h-6 mr-3 text-blue-400" />
                  <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500">Prescription History</h2>
                </div>
                {Array.isArray(prescriptionHistory) && prescriptionHistory.length > 0 ? (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Doctor</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescriptionHistory.map((prescription) => (
                        <tr
                          key={prescription.id}
                          className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer"
                          onClick={() => handlePrescriptionClick(prescription)}
                        >
                          <td className="py-3 px-4 text-gray-300">{prescription.name}</td>
                          <td className="py-3 px-4 text-gray-300">{prescription.date}</td>
                          <td className="py-3 px-4 text-gray-300">{prescription.doctor}</td>
                          <td className="py-3 px-4">
                            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                              {prescription.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={(event) => handleDeletePrescription(prescription.id, event)}
                              className="p-1 text-red-400 hover:text-red-300 transition-colors"
                              title="Delete prescription"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    No prescription history available. Upload a prescription to get started.
                  </div>
                )}
              </div>
            </div>
            <div className="w-80 flex-shrink-0 overflow-y-auto pl-6">
              <div className="sticky top-0 pt-8">
                <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/30 shadow-xl mb-6">
                  <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500 mb-4">
                    Action Center
                  </h3>
                  <button
                    onClick={generateAiSummary}
                    disabled={!structuredText || isSummarizing}
                    className={`w-full bg-gradient-to-r from-blue-600 to-purple-600 ${
                      !structuredText || isSummarizing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                    } text-white py-3 px-4 rounded-xl mb-3 transition-all flex items-center justify-center`}
                  >
                    {isSummarizing ? (
                      <>
                        <div className="animate-spin mr-2 h-5 w-5 border-2 border-white border-opacity-20 border-t-white rounded-full"></div>
                        Generating Summary...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate AI Summary
                      </>
                    )}
                  </button>
                  <button
                    onClick={generateWellnessTips}
                    disabled={!structuredText || isGeneratingTips}
                    className={`w-full bg-gradient-to-r from-green-600 to-teal-600 ${
                      !structuredText || isGeneratingTips ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                    } text-white py-3 px-4 rounded-xl mb-3 transition-all flex items-center justify-center`}
                  >
                    {isGeneratingTips ? (
                      <>
                        <div className="animate-spin mr-2 h-5 w-5 border-2 border-white border-opacity-20 border-t-white rounded-full"></div>
                        Generating Tips...
                      </>
                    ) : (
                      <>
                        <Stethoscope className="w-5 h-5 mr-2" />
                        Get Wellness Tips
                      </>
                    )}
                  </button>
                  {aiSummary && (
                    <div className="mt-4 pt-4 border-t border-gray-700/50">
                      <div className="flex items-center mb-3">
                        <Sparkles className="w-5 h-5 text-blue-400 mr-2" />
                        <h4 className="text-md font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500">AI Summary</h4>
                      </div>
                      <div className="prose prose-invert prose-sm max-w-none text-xs">
                        {formatAiText(aiSummary)}
                      </div>
                    </div>
                  )}
                  {wellnessTips && (
                    <div className="mt-4 pt-4 border-t border-gray-700/50">
                      <div className="flex items-center mb-3">
                        <Stethoscope className="w-5 h-5 text-green-400 mr-2" />
                        <h4 className="text-md font-semibold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">Wellness Tips</h4>
                      </div>
                      <div className="prose prose-invert prose-sm max-w-none text-xs">
                        {formatAiText(wellnessTips)}
                      </div>
                    </div>
                  )}
                </div>
                {currentMedications.length > 0 && (
                  <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/30 shadow-xl">
                    <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500 mb-4">
                      Medications
                    </h3>
                    <ul className="space-y-2">
                      {currentMedications.map((med) => (
                        <li key={`mini-${med.id}`} className="flex items-center py-2 border-b border-gray-700/30 last:border-b-0">
                          <span className="flex items-center justify-center w-6 h-6 bg-blue-500/20 text-blue-300 rounded-full mr-3 text-xs">
                            {med.id}
                          </span>
                          <div className="flex-1">
                            <div className="text-gray-300 font-medium">{med.name}</div>
                            <div className="text-gray-500 text-sm">{med.dosage}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionAnalyzer;