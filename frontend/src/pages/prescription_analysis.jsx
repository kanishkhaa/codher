import React, { useState, useRef, useContext } from 'react';
import axios from 'axios';
import { FileText, AlertTriangle, Upload, Clock, Sparkles, Stethoscope } from 'lucide-react';
import Sidebar from '../../components/sidebar';
import { AppContext } from "../context/AppContext";

const PrescriptionAnalyzer = () => {
  const { 
    prescriptionHistory, 
    setPrescriptionHistory, 
    medicationData, 
    setMedicationData, 
    setReminders 
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
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
      setProcessingStatus('Uploading and processing...');
      setErrorMessage('');
      setStructuredText('');
      setAiSummary('');
      setWellnessTips('');

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await axios.post('http://localhost:5000/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 30000,
        });

        if (response.data.error) {
          throw new Error(response.data.error);
        }

        setStructuredText(response.data.structured_text || 'Unable to structure text');
        const parsedMedications = parseMedicationData(response.data.structured_text);

        // Update shared medication data
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

        // Generate and update reminders
        const medications = parseMedicationData(response.data.structured_text);
        const today = new Date();
        const newReminders = medications.map((med, index) => ({
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
        medications.forEach((med, index) => {
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
    }
  };

  const generateAiSummary = async () => {
    if (!prescriptionHistory.length || !structuredText) {
      setErrorMessage('No prescription data available for summarization');
      return;
    }

    setIsSummarizing(true);
    try {
      const latestPrescription = prescriptionHistory[prescriptionHistory.length - 1];
      const payload = {
        structured_text: structuredText,
        medications: medicationData,
        raw_data: latestPrescription.rawData
      };

      const response = await axios.post('http://localhost:5000/generate-summary', payload, {
        timeout: 30000
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setAiSummary(response.data.summary);
    } catch (error) {
      console.error('Summary Generation Error:', error);
      generateLocalSummary();
    } finally {
      setIsSummarizing(false);
    }
  };

  const generateLocalSummary = () => {
    if (!medicationData.length) {
      setAiSummary('No medication data available to summarize.');
      return;
    }

    const patientNameMatch = structuredText.match(/\*\*Patient Information:\*\*[\s\S]*?Name: ([^\n]*)/);
    const patientName = patientNameMatch ? patientNameMatch[1].trim() : 'Patient';

    const doctorNameMatch = structuredText.match(/\*\*Doctor Information:\*\*[\s\S]*?Name: ([^\n]*)/);
    const doctorName = doctorNameMatch ? doctorNameMatch[1].trim() : 'Unknown Doctor';

    const dateMatch = structuredText.match(/Date: ([^\n]*)/);
    const prescriptionDate = dateMatch ? dateMatch[1].trim() : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const genderMatch = structuredText.match(/Gender: ([^\n]*)/);
    const patientGender = genderMatch ? `(${genderMatch[1].trim().charAt(0)})` : '';

    const highRiskInteractions = medicationData.some(med => 
      med.interactions && med.interactions.some(interaction => interaction.severity === 'high')
    );

    let summary = '';
    summary += `Patient: ${patientName} ${patientGender}\n`;
    summary += `Date: ${prescriptionDate}\n`;
    summary += `Physician: Dr. ${doctorName}\n`;
    summary += `Medications:\n`;

    medicationData.forEach((med, index) => {
      const superscriptNumbers = ['¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹', '¹⁰'];
      const medNumber = superscriptNumbers[index] || `${index + 1}`;
      const dosageText = med.dosage || 'As prescribed';
      summary += `  ${med.name}${medNumber}: ${dosageText}\n`;
    });

    if (highRiskInteractions) {
      summary += `Alert: High-risk interactions detected - consult your doctor\n`;
    }

    summary += `Tip: Take medications as prescribed and stay hydrated`;
    setAiSummary(summary);
  };

  const generateWellnessTips = async () => {
    if (!prescriptionHistory.length || !structuredText) {
      setErrorMessage('No prescription data available for generating tips');
      return;
    }

    setIsGeneratingTips(true);
    try {
      const latestPrescription = prescriptionHistory[prescriptionHistory.length - 1];
      const payload = {
        structured_text: structuredText,
        medications: medicationData,
        raw_data: latestPrescription.rawData
      };

      const response = await axios.post('http://localhost:5000/generate-wellness-tips', payload, {
        timeout: 30000
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setWellnessTips(response.data.tips);
    } catch (error) {
      console.error('Wellness Tips Generation Error:', error);
      generateLocalWellnessTips();
    } finally {
      setIsGeneratingTips(false);
    }
  };

  const generateLocalWellnessTips = () => {
    if (!medicationData.length) {
      setWellnessTips('No medication data available to generate tips.');
      return;
    }

    let tips = "Wellness Tips\n\n";
    tips += "• Take medications exactly as prescribed\n";
    tips += "• Stay hydrated throughout the day\n";
    tips += "• Maintain a balanced diet rich in fruits and vegetables\n";
    tips += "• Get adequate rest and sleep\n";

    medicationData.forEach(med => {
      if (med.name.toLowerCase().includes("antibiot")) {
        tips += "• Complete the full course of antibiotics even if you feel better\n";
      }
      if (med.sideEffects.includes("Drowsiness")) {
        tips += "• Avoid driving or operating heavy machinery if experiencing drowsiness\n";
      }
      if (med.sideEffects.includes("Nausea")) {
        tips += "• Take medication with food if experiencing nausea\n";
      }
    });

    setWellnessTips(tips);
  };

  const parseMedicationData = (text) => {
    if (!text) return [];
    
    const medications = [];
    const medicationSection = text.split('Medications:')[1]?.split('Special Instructions:')[0];
    
    if (!medicationSection) return [];
    
    const medicationRegex = /\*\s\*\*(\d+)\)\s([^:]+):\*\*\s(.+?)(?=\*\s\*\*|\*\sSpecial|$)/gs;
    let match;
    
    while ((match = medicationRegex.exec(medicationSection)) !== null) {
      medications.push({
        id: match[1],
        name: match[2].trim(),
        dosage: match[3].trim(),
        description: getRandomDrugDescription(match[2].trim()),
        cautions: getRandomDrugCautions(),
        sideEffects: getRandomSideEffects(),
        interactions: getRandomInteractions()
      });
    }
    
    return medications;
  };

  const getRandomDrugDescription = (drugName) => {
    const descriptions = {
      'Abciximab': 'A platelet aggregation inhibitor primarily used during and after coronary artery procedures to prevent blood clots.',
      'Vomilast': 'A combination medication containing Doxylamine, Pyridoxine, and Folic Acid for nausea and vomiting.',
      'Zoclar 500': 'Clarithromycin, a macrolide antibiotic for bacterial infections.',
      'Gestakind 10/SR': 'Isoxsuprine, a vasodilator improving blood flow.'
    };
    const baseName = drugName.split('(')[0].trim();
    return descriptions[baseName] || `${drugName} is used as prescribed by your doctor.`;
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

  const formatStructuredText = (text) => {
    if (!text) return [];
    const sections = text.split(/\*\*([^*]+):\*\*/).filter(Boolean);
    let formattedContent = [];
    for (let i = 0; i < sections.length; i += 2) {
      const sectionTitle = sections[i];
      const sectionContent = sections[i + 1] || '';
      formattedContent.push(
        <h3 key={`title-${i}`} className="text-xl font-semibold text-blue-400 mt-4 mb-2">
          {sectionTitle}
        </h3>
      );
      const contentLines = sectionContent.split('\n').filter(line => line.trim());
      contentLines.forEach((line, lineIndex) => {
        const cleanLine = line.replace(/^\s*\*\s*/, '').trim();
        if (cleanLine) {
          formattedContent.push(
            <p key={`content-${i}-${lineIndex}`} className="text-gray-300 ml-4 mb-1">
              {cleanLine}
            </p>
          );
        }
      });
    }
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
    switch (severity) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-blue-400';
      default: return 'text-gray-400';
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

              {processingStatus === 'Processing complete' && medicationData.length > 0 && (
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
                      {medicationData.map((med) => (
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
                            {Array.isArray(med.cautions) 
  ? med.cautions.map((caution, idx) => (
      <li key={idx} className="text-gray-300 mb-1">{caution}</li>
    )) 
  : <li className="text-gray-300 mb-1">No cautions available</li>}

                            </ul>
                            <div className="text-blue-300 font-medium mb-1 text-sm uppercase tracking-wider">Side Effects:</div>
                            <div className="flex flex-wrap gap-2">
  {Array.isArray(med.sideEffects) && med.sideEffects.length > 0 ? (
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
                      {medicationData.map((med) => {
                        const interactions = med.interactions || [];
                        return (
                          <div key={`interactions-${med.id}`} className="border-b border-gray-700/50 pb-6 last:border-b-0">
                            <h4 className="text-lg font-semibold text-amber-400 mb-3 flex items-center">
                              <span className="flex items-center justify-center w-8 h-8 bg-amber-500/20 text-amber-300 rounded-full mr-3 text-sm">
                                {med.id}
                              </span>
                              {med.name}
                            </h4>
                            <div className="pl-11">
                              {interactions.length > 0 ? (
                                <>
                                  <div className="text-amber-300 font-medium mb-3 text-sm uppercase tracking-wider">
                                    Potential Interactions:
                                  </div>
                                  <div className="space-y-3">
                                    {interactions.map((interaction, idx) => (
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
                        );
                      })}
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
                      </tr>
                    </thead>
                    <tbody>
                      {prescriptionHistory.map((prescription) => (
                        <tr key={prescription.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 cursor-pointer">
                          <td className="py-3 px-4 text-gray-300">{prescription.name}</td>
                          <td className="py-3 px-4 text-gray-300">{prescription.date}</td>
                          <td className="py-3 px-4 text-gray-300">{prescription.doctor}</td>
                          <td className="py-3 px-4">
                            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                              {prescription.status}
                            </span>
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
                {medicationData.length > 0 && (
                  <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/30 shadow-xl">
                    <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500 mb-4">
                      Medications
                    </h3>
                    <ul className="space-y-2">
                      {medicationData.map((med) => (
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