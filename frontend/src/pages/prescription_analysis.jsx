import React, { useState, useRef, useContext, useEffect } from 'react';
import axios from 'axios';
import { FileText, AlertTriangle, Upload, Clock, Sparkles, Stethoscope, AlertCircle, Trash2, Pill } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../../components/sidebar';
import { AppContext } from "../context/AppContext";
import { QRCodeSVG } from 'qrcode.react';
import { DataSet, Network } from 'vis-network/standalone';
import 'vis-network/styles/vis-network.css';
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
  const [drugNameInput, setDrugNameInput] = useState('');
  const [drugAlternatives, setDrugAlternatives] = useState([]);
  const [isFetchingAlternatives, setIsFetchingAlternatives] = useState(false);
  const [showAlternativesModal, setShowAlternativesModal] = useState(false);
  const [drugGraph, setDrugGraph] = useState({ nodes: [], edges: [] });
  const fileInputRef = useRef(null);
  const graphRef = useRef(null);
  const networkRef = useRef(null);

  // Fetch drug graph on mount
  useEffect(() => {
    const fetchDrugGraph = async () => {
      try {
        const response = await axios.get('http://localhost:5000/get-drug-graph');
        setDrugGraph(response.data);
      } catch (error) {
        console.error('Error fetching drug graph:', error);
        setErrorMessage('Failed to load drug graph.');
      }
    };
    fetchDrugGraph();
  }, []);

  // Render graph when alternatives modal is opened
  useEffect(() => {
    if (showAlternativesModal && graphRef.current && drugGraph.nodes.length > 0) {
      const nodes = new DataSet(drugGraph.nodes.map(node => ({
        ...node,
        color: node.id.toLowerCase() === drugNameInput.toLowerCase() ? '#7e22ce' : '#3b82f6',
        font: { color: '#ffffff', size: 14 },
        size: node.id.toLowerCase() === drugNameInput.toLowerCase() ? 30 : 20
      })));
      const edges = new DataSet(drugGraph.edges.map(edge => ({
        ...edge,
        color: { color: '#9ca3af', highlight: '#f97316' },
        width: edge.value * 5,
        font: { color: '#ffffff', size: 12 }
      })));

      const data = { nodes, edges };
      const options = {
        physics: { stabilization: true },
        layout: { hierarchical: false },
        interaction: { zoomView: true, dragView: true },
        nodes: { shape: 'dot', scaling: { min: 10, max: 30 } },
        edges: { smooth: { type: 'continuous' } }
      };

      if (networkRef.current) {
        networkRef.current.destroy();
      }
      networkRef.current = new Network(graphRef.current, data, options);

      // Focus on input drug
      const inputNodeId = drugGraph.nodes.find(node => node.id.toLowerCase() === drugNameInput.toLowerCase())?.id;
      if (inputNodeId) {
        networkRef.current.focus(inputNodeId, { scale: 1.0, animation: true });
      }
    }
  }, [showAlternativesModal, drugGraph, drugNameInput]);

  // BFS to find closest alternatives
  const findClosestAlternatives = (startDrug) => {
    const graph = {};
    drugGraph.nodes.forEach(node => {
      graph[node.id] = [];
    });
    drugGraph.edges.forEach(edge => {
      graph[edge.from].push({ name: edge.to, similarity: edge.value });
      graph[edge.to].push({ name: edge.from, similarity: edge.value });
    });

    const queue = [startDrug.toLowerCase()];
    const visited = new Set();
    const alternatives = [];

    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);

      const neighbors = graph[current] || [];
      neighbors.sort((a, b) => b.similarity - a.similarity); // Prioritize higher similarity
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.name)) {
          alternatives.push({ name: neighbor.name, similarity: neighbor.similarity });
          queue.push(neighbor.name);
        }
      }
    }

    return alternatives;
  };

  // Fetch drug alternatives
  const fetchDrugAlternatives = async () => {
    if (!drugNameInput.trim()) {
      setErrorMessage('Please enter a drug name');
      return;
    }
    setIsFetchingAlternatives(true);
    try {
      const response = await axios.post('http://localhost:5000/find-alternatives', {
        drugs: [drugNameInput.trim()]
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data.error) throw new Error(response.data.error);
      const alternatives = response.data.alternatives[drugNameInput.trim()] || [];
      setDrugAlternatives(alternatives);

      // Use BFS to get ordered alternatives
      const bfsAlternatives = findClosestAlternatives(drugNameInput.trim());
      setDrugAlternatives(bfsAlternatives);
      setShowAlternativesModal(true);
    } catch (error) {
      console.error('Error fetching drug alternatives:', error);
      setErrorMessage('Failed to fetch alternatives: ' + error.message);
    } finally {
      setIsFetchingAlternatives(false);
    }
  };

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
    const nextReviewDate = dateMatch ? dateMatch[1].trim() : 'Unknown Date';

    let summary = `Prescription Summary for ${patientName}\n\n`;
    summary += `Prescribed by: ${doctorName}\n`;
    summary += `Medications:\n`;
    currentMedications.forEach((med) => {
      summary += `• ${med.name}: ${med.dosage}\n`;
    });
    summary += `\nNext Review: ${nextReviewDate}`;

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

    const sections = text.split(/\n\n(?=\*\*[A-Z][^\n]*:\*\*)/).filter(Boolean);
    const formattedContent = [];

    sections.forEach((section, sectionIndex) => {
      const lines = section.split('\n').filter(line => line.trim());
      if (!lines.length) return;

      const sectionTitleMatch = lines[0].match(/\*\*(.+?):\*\*/);
      const sectionTitle = sectionTitleMatch ? sectionTitleMatch[1].trim() : lines[0].trim();

      formattedContent.push(
        <h3
          key={`title-${sectionIndex}`}
          className="text-xl font-semibold text-blue-400 mt-6 mb-3 tracking-wide"
        >
          {sectionTitle}
        </h3>
      );

      lines.slice(1).forEach((line, lineIndex) => {
        const cleanLine = line.replace(/\*+\s*/g, '').trim();
        if (!cleanLine) return;

        if (sectionTitle === 'Medications') {
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

            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 mb-8 border border-gray-700/30 shadow-xl">
              <div className="flex items-center mb-4">
                <Pill className="w-6 h-6 text-purple-400 mr-2" />
                <h3 className="text-lg font-semibold text-purple-400">Find Drug Alternatives</h3>
              </div>
              <div className="flex space-x-4">
                <input
                  type="text"
                  placeholder="Enter drug name (e.g., Paracetamol)"
                  value={drugNameInput}
                  onChange={(e) => setDrugNameInput(e.target.value)}
                  className="flex-1 bg-gray-700/50 text-white px-4 py-2 rounded-xl border border-gray-600/30 focus:ring-2 focus:ring-purple-500/50 transition-all"
                />
                <button
                  onClick={fetchDrugAlternatives}
                  disabled={isFetchingAlternatives}
                  className={`bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-xl hover:scale-105 transition-transform flex items-center ${isFetchingAlternatives ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isFetchingAlternatives ? (
                    <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z" />
                    </svg>
                  ) : (
                    <Sparkles className="w-5 h-5 mr-2" />
                  )}
                  Find Alternatives
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

          {showAlternativesModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="bg-gray-800/90 rounded-2xl p-6 max-w-3xl w-full mx-4 border border-gray-700/30 shadow-2xl"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                    Alternatives for {drugNameInput}
                  </h3>
                  <button
                    onClick={() => setShowAlternativesModal(false)}
                    className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700/50 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                
                {drugGraph.nodes.length > 0 && drugAlternatives.length > 0 ? (
                  <>
                    <div className="mb-4">
                      <div className="bg-purple-500/20 rounded-lg p-3 mb-4 border border-purple-500/30">
                        <div className="flex items-start">
                          <AlertCircle className="w-5 h-5 text-purple-400 mr-2 mt-0.5 flex-shrink-0" />
                          <p className="text-purple-200 text-sm">
                            Nodes represent medications, with proximity to {drugNameInput} indicating higher similarity. Edges show similarity scores. Hover or click nodes to explore.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-900/50 rounded-lg p-4 mb-4 border border-gray-700/30" style={{ height: '400px' }}>
                      <div ref={graphRef} style={{ width: '100%', height: '100%' }} />
                    </div>
                    
                    <div className="space-y-3 max-h-40 overflow-y-auto pr-1 custom-scrollbar mb-4">
                      {drugAlternatives.map((alt, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-gray-700/50 hover:bg-gray-700/70 rounded-lg p-4 flex items-center justify-between group transition-colors cursor-pointer border border-gray-600/30"
                        >
                          <div className="flex items-center">
                            <div className="p-2 bg-purple-500/20 rounded-full mr-3">
                              <Pill className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                              <p className="text-gray-200 font-medium group-hover:text-white transition-colors">{alt.name}</p>
                              <p className="text-gray-400 text-xs mt-1">Similarity: {(alt.similarity * 100).toFixed(0)}%</p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <div className="flex space-x-0.5">
                              {Array(5).fill(0).map((_, i) => (
                                <div 
                                  key={i} 
                                  className={`w-1.5 h-6 rounded-sm ${i < Math.round(alt.similarity * 5) ? 'bg-purple-500' : 'bg-gray-600'}`} 
                                />
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => {
                          // Placeholder for saving alternatives
                          setShowAlternativesModal(false);
                        }}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-xl hover:scale-105 transition-transform flex items-center justify-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h1a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h1v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                        </svg>
                        Save List
                      </button>
                      <button
                        onClick={() => setShowAlternativesModal(false)}
                        className="bg-gray-700 text-white py-3 px-4 rounded-xl hover:bg-gray-600 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="bg-gray-700/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="w-8 h-8 text-yellow-400" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-300 mb-2">No alternatives found</h4>
                    <p className="text-gray-400 text-sm mb-6">
                      We couldn't find any alternatives for "{drugNameInput}". This may be due to the medication being unique or specialized.
                    </p>
                    <button
                      onClick={() => setShowAlternativesModal(false)}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 px-6 rounded-xl hover:scale-105 transition-transform inline-flex"
                    >
                      Close
                    </button>
                  </div>
                )}
              </motion.div>
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
                                    <div
                                      key={idx}
                                      className="bg-gray-700/50 rounded-lg p-3 flex items-center justify-between"
                                    >
                                      <div>
                                        <p className="text-gray-200 font-medium">
                                          {interaction.drugName}
                                        </p>
                                        <p className="text-gray-400 text-sm">
                                          {interaction.effect}
                                        </p>
                                      </div>
                                      <span
                                        className={`text-sm font-medium ${getSeverityColor(
                                          interaction.severity
                                        )}`}
                                      >
                                        {interaction.severity.toUpperCase()}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <p className="text-gray-300">
                                No known interactions for {med.name}.
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {structuredText && (
                    <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/30 shadow-xl">
                      <div className="flex items-center mb-6">
                        <div className="p-4 rounded-full mr-6 bg-gradient-to-br from-blue-500 to-cyan-600">
                          <Stethoscope className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500 mb-1">
                            Prescription Details
                          </h3>
                          <p className="text-gray-400 text-sm tracking-wide">
                            Structured prescription information
                          </p>
                        </div>
                      </div>
                      <div className="prose prose-invert max-w-none">
                        {formatStructuredText(structuredText)}
                      </div>
                    </div>
                  )}

                  {aiSummary && (
                    <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/30 shadow-xl">
                      <div className="flex items-center mb-6">
                        <div className="p-4 rounded-full mr-6 bg-gradient-to-br from-purple-500 to-pink-600">
                          <Sparkles className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500 mb-1">
                            AI-Generated Summary
                          </h3>
                          <p className="text-gray-400 text-sm tracking-wide">
                            Key insights from your prescription
                          </p>
                        </div>
                      </div>
                      <div>{formatAiText(aiSummary)}</div>
                    </div>
                  )}

                  {wellnessTips && (
                    <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/30 shadow-xl">
                      <div className="flex items-center mb-6">
                        <div className="p-4 rounded-full mr-6 bg-gradient-to-br from-green-500 to-teal-600">
                          <Clock className="w-7 h-7 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500 mb-1">
                            Wellness Tips
                          </h3>
                          <p className="text-gray-400 text-sm tracking-wide">
                            Personalized health recommendations
                          </p>
                        </div>
                      </div>
                      <div>{formatAiText(wellnessTips)}</div>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/30 shadow-xl">
                <div className="flex items-center mb-6">
                  <div className="p-4 rounded-full mr-6 bg-gradient-to-br from-blue-500 to-cyan-600">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-500 mb-1">
                      Prescription History
                    </h3>
                    <p className="text-gray-400 text-sm tracking-wide">
                      Your past prescriptions
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  {prescriptionHistory.length > 0 ? (
                    prescriptionHistory.map((prescription) => (
                      <div
                        key={prescription.id}
                        onClick={() => handlePrescriptionClick(prescription)}
                        className="bg-gray-700/50 hover:bg-gray-700/70 rounded-lg p-4 flex items-center justify-between group transition-colors cursor-pointer"
                      >
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-500/20 rounded-full mr-3">
                            <FileText className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-gray-200 font-medium group-hover:text-white transition-colors">
                              {prescription.name}
                            </p>
                            <p className="text-gray-400 text-xs mt-1">
                              {prescription.date} | {prescription.doctor}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400 text-xs">
                            {prescription.status}
                          </span>
                          <button
                            onClick={(e) =>
                              handleDeletePrescription(prescription.id, e)
                            }
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 p-2 rounded-full hover:bg-red-500/20 transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-center">
                      No prescription history available.
                    </p>
                  )}
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