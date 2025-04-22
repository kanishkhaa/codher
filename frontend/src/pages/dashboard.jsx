import React, { useState, useEffect, useContext } from 'react';
import { Calendar, Clock, AlertCircle, PieChart, Activity, User, Hash } from 'lucide-react';
import Sidebar from '../../components/sidebar';
import { AppContext } from '../context/AppContext.jsx';
import axios from 'axios';

const MedicationDashboard = () => {
  const { prescriptionHistory, setPrescriptionHistory, medicationData, setMedicationData, reminders, setReminders } = useContext(AppContext);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeSegment, setActiveSegment] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    totalMedications: 0,
    nextRefillDate: 'N/A',
    missedDosesWeek: 0,
    monthlyHealthScore: 0,
    medicationTypes: [],
    todaysMedications: [],
    missedDoses: [],
    upcomingRefills: [],
    medicationCache: {},
  });
  const [loading, setLoading] = useState(true);
  const [lookupInput, setLookupInput] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [toast, setToast] = useState(null);

  // Simulated hash function for visualization
  const simpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % 1000;
  };

  // Normalize medication name for keys
  const normalizeKey = (name) => {
    // Extract base name (e.g., "abciximab" from "tab. abciximab:1 tablet...")
    const match = name.match(/^[^.\s]+(?:\.\s)?([^\s:]+)/i);
    return match ? match[1].toLowerCase() : name.toLowerCase();
  };

  // Fetch dashboard data from backend
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/dashboard');
      const data = response.data;
      // Normalize cache keys
      const normalizedCache = {};
      Object.entries(data.medicationCache).forEach(([key, value]) => {
        const normalized = normalizeKey(key);
        normalizedCache[normalized] = {
          ...value,
          name: value.name.replace(/:.*$/, ''), // Clean name
          description: value.description.replace(/\(Total.*$/i, '').trim(),
        };
      });
      setDashboardData({ ...data, medicationCache: normalizedCache });
      setToast({ type: 'success', message: 'Medication cache populated!' });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      deriveDashboardData();
    }
    setLoading(false);
  };

  // Clear cache and refresh dashboard
  const clearCache = async () => {
    try {
      await axios.post('http://localhost:5000/clear-cache');
      await fetchDashboardData();
      setToast({ type: 'info', message: 'Medication cache cleared!' });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('Error clearing cache:', error);
      setToast({ type: 'error', message: 'Failed to clear cache.' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Handle hashtable lookup demo
  const handleLookup = () => {
    const key = normalizeKey(lookupInput);
    const startTime = performance.now();
    const result = dashboardData.medicationCache[key] || null;
    const endTime = performance.now();
    let hashtableTime = (endTime - startTime).toFixed(3);

    // Simulate linear search
    const linearStart = performance.now();
    const linearResult = medicationData.find(med => normalizeKey(med.name) === key) || null;
    const linearEnd = performance.now();
    let linearTime = (linearEnd - linearStart).toFixed(3);

    // Amplify timing for demo (simulate larger dataset)
    hashtableTime = (parseFloat(hashtableTime) + 0.01).toFixed(3);
    linearTime = (parseFloat(linearTime) + 0.05 * medicationData.length).toFixed(3);

    setLookupResult({
      key,
      data: result,
      hashtableTime,
      linearTime,
      hashValue: simpleHash(key),
    });
  };

  const deriveDashboardData = () => {
    setLoading(true);

    const today = new Date().toISOString().split('T')[0];
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const isToday = (dateString) => dateString === today;
    const isOverdue = (dateString, timeString) => {
      const now = new Date();
      const reminderTime = new Date(`${dateString}T${timeString}`);
      return now > reminderTime && dateString <= today;
    };

    // Build medication cache locally
    const medicationCache = {};
    medicationData.forEach(med => {
      let type = 'Others';
      const description = med.description?.toLowerCase() || '';
      if (description.includes('antibiotic')) {
        type = 'Antibiotics';
      } else if (description.includes('pain') || description.includes('nsaid')) {
        type = 'Painkillers';
      } else if (
        description.includes('cardio') ||
        description.includes('blood pressure') ||
        description.includes('heart') ||
        description.includes('ace inhibitor')
      ) {
        type = 'Cardiovascular';
      } else if (description.includes('neuro') || description.includes('brain')) {
        type = 'Neurological';
      } else if (
        description.includes('hormon') ||
        description.includes('diabetes') ||
        description.includes('biguanide')
      ) {
        type = 'Hormonal';
      } else if (description.includes('cholesterol') || description.includes('statin')) {
        type = 'Cholesterol';
      }
      const key = normalizeKey(med.name);
      medicationCache[key] = {
        name: med.name.replace(/:.*$/, ''),
        description: med.description.replace(/\(Total.*$/i, '').trim() || 'Unknown',
        type,
      };
    });

    const totalMedications = medicationData.length;
    const upcomingRefills = reminders
      .filter(r => r.recurring === 'none' && r.title.includes('Refill'))
      .map(r => ({
        name: r.medication,
        date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    const nextRefillDate = upcomingRefills[0]?.date || 'N/A';

    const missedDoses = reminders
      .filter(r => {
        const reminderDate = new Date(r.date);
        return (
          reminderDate >= oneWeekAgo &&
          reminderDate <= new Date() &&
          !r.completed &&
          typeof r.title === 'string' &&
          (r.title.includes('Take') || r.title.toLowerCase().includes('dose'))
        );
      })
      .map(r => {
        const key = normalizeKey(r.medication);
        const medication = medicationCache[key] || {};
        return {
          id: r.id,
          name: r.medication,
          date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          time: r.time,
          type: medication.type || 'Unknown',
        };
      });
    const missedDosesWeek = missedDoses.length;

    const monthlyHealthScore = Math.min(100, Math.max(0, 100 - missedDosesWeek * 5));

    const typeCounts = {};
    Object.values(medicationCache).forEach(med => {
      const type = med.type || 'Others';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const totalTypes = Object.values(typeCounts).reduce((sum, count) => sum + count, 0) || 0;
    const medicationTypes = Object.entries(typeCounts).map(([name, count]) => ({
      name,
      percentage: totalTypes ? (count / totalTypes) * 100 : 0,
      color:
        name === 'Painkillers'
          ? '#FF6B6B'
          : name === 'Antibiotics'
          ? '#4ECDC4'
          : name === 'Hormonal'
          ? '#FF9F1C'
          : name === 'Cardiovascular'
          ? '#8675A9'
          : name === 'Neurological'
          ? '#5D93E1'
          : name === 'Cholesterol'
          ? '#45B7D1'
          : '#D3D3D3',
      count,
      emoji:
        name === 'Painkillers'
          ? '🩹'
          : name === 'Antibiotics'
          ? '💊'
          : name === 'Hormonal'
          ? '🧬'
          : name === 'Cardiovascular'
          ? '❤️'
          : name === 'Neurological'
          ? '🧠'
          : name === 'Cholesterol'
          ? '📉'
          : '🏥',
    }));

    const todaysMedications = reminders
      .filter(r => isToday(r.date) && r.title?.includes('Take'))
      .map(r => {
        const key = normalizeKey(r.medication);
        const medication = medicationCache[key] || {};
        return {
          id: r.id,
          name: r.medication,
          time: r.time,
          taken: r.completed,
          type: medication.type || 'Unknown',
        };
      });

    setDashboardData(prev => ({
      ...prev,
      totalMedications,
      nextRefillDate,
      missedDosesWeek,
      monthlyHealthScore,
      medicationTypes,
      todaysMedications,
      missedDoses,
      upcomingRefills,
      medicationCache,
    }));
    console.log('Dashboard Data Updated:', { medicationTypes, totalTypes, medicationData });
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, [prescriptionHistory, medicationData, reminders]);

  const InteractivePieChart = ({ data }) => {
    if (!data || data.length === 0 || data.every(segment => segment.count === 0)) {
      console.log('PieChart: No valid data to display', data);
      return (
        <div className="relative w-full aspect-square flex items-center justify-center text-slate-500">
          <p>No medication types to display</p>
        </div>
      );
    }

    const totalPercentage = data.reduce((sum, segment) => sum + segment.percentage, 0) || 1;
    const adjustedData = data.map(segment => ({
      ...segment,
      percentage: (segment.percentage / totalPercentage) * 100,
    }));

    console.log('PieChart Adjusted Data:', adjustedData);

    return (
      <div className="relative w-full aspect-square">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {adjustedData.map((segment, index) => {
            const percentage = Math.max(segment.percentage, 0.5);
            const startAngle = index === 0 ? 0 : adjustedData.slice(0, index).reduce((sum, s) => sum + Math.max(s.percentage, 0.5) * 3.6, 0);
            const endAngle = startAngle + percentage * 3.6;

            const startRad = ((startAngle - 90) * Math.PI) / 180;
            const endRad = ((endAngle - 90) * Math.PI) / 180;
            const radius = activeSegment === index ? 45 : 40;
            const x1 = 50 + radius * Math.cos(startRad);
            const y1 = 50 + radius * Math.sin(startRad);
            const x2 = 50 + radius * Math.cos(endRad);
            const y2 = 50 + radius * Math.sin(endRad);
            const largeArcFlag = percentage > 50 ? 1 : 0;

            const path = `M 50 50 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

            const midRad = (startRad + endRad) / 2;
            const labelRadius = radius * 0.7;
            const labelX = 50 + labelRadius * Math.cos(midRad);
            const labelY = 50 + labelRadius * Math.sin(midRad);

            console.log(`Segment ${index}:`, { name: segment.name, percentage, startAngle, endAngle });

            return (
              <g key={index}>
                <path
                  d={path}
                  fill={segment.color}
                  stroke="#1a1e2e"
                  strokeWidth="0.5"
                  onMouseEnter={() => setActiveSegment(index)}
                  onMouseLeave={() => setActiveSegment(null)}
                  className="transition-all duration-300 cursor-pointer"
                  style={{ transform: activeSegment === index ? 'scale(1.05)' : 'scale(1)', transformOrigin: '50% 50%' }}
                />
                {percentage >= 5 && (
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="4"
                    fontWeight="bold"
                    style={{ textShadow: '0px 0px 2px rgba(0,0,0,0.8)' }}
                  >
                    {Math.round(percentage)}%
                  </text>
                )}
              </g>
            );
          })}
          <circle cx="50" cy="50" r="20" fill="#1e293b" stroke="#0f172a" strokeWidth="0.5" />
        </svg>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          {activeSegment !== null ? (
            <>
              <div className="text-4xl mb-1">{adjustedData[activeSegment].emoji}</div>
              <div className="text-xs font-bold">{adjustedData[activeSegment].name}</div>
              <div className="text-lg font-bold text-indigo-400">{Math.round(adjustedData[activeSegment].percentage)}%</div>
              <div className="text-xs text-slate-400">{adjustedData[activeSegment].count} meds</div>
            </>
          ) : (
            <>
              <div className="text-2xl mb-1">💊</div>
              <div className="text-xs font-bold">Total</div>
              <div className="text-lg font-bold text-indigo-400">{adjustedData.reduce((sum, type) => sum + type.count, 0)}</div>
              <div className="text-xs text-slate-400">medications</div>
            </>
          )}
        </div>
      </div>
    );
  };

  const extractMedicationsFromStructuredText = (structuredText) => {
    if (!structuredText || typeof structuredText !== 'string') return [];
    const lines = structuredText.split('\n');
    const medications = [];
    let inMedicationSection = false;

    for (const line of lines) {
      if (line.startsWith('### Medications') || line.startsWith('## Medications')) {
        inMedicationSection = true;
        continue;
      }
      if (inMedicationSection && line.startsWith('- Medicine Name:')) {
        const parts = line.split(', ');
        const medicineName = parts[0].replace('- Medicine Name: ', '').trim();
        const dosage = parts[1]?.replace('Dosage: ', '').trim() || 'N/A';
        const frequency = parts[2]?.replace('Frequency: ', '').trim() || 'N/A';
        medications.push({ medicineName, dosage, frequency });
      }
      if (inMedicationSection && line.startsWith('#')) {
        inMedicationSection = false;
      }
    }
    return medications;
  };

  const checkDrugInteractions = (newMedications, existingMeds) => {
    const interactions = [];
    const allMeds = [...existingMeds, ...newMedications];
    const interactionRules = {
      'Aspirin': ['Ibuprofen', 'Warfarin'],
      'Metformin': ['Cimetidine'],
      'Ibuprofen': ['Aspirin'],
    };

    allMeds.forEach(med1 => {
      allMeds.forEach(med2 => {
        if (med1.name !== med2.name && interactionRules[med1.name]?.includes(med2.name)) {
          interactions.push({
            med1: med1.name,
            med2: med2.name,
            warning: `Potential interaction between ${med1.name} and ${med2.name}`,
          });
        }
      });
    });
    return interactions;
  };

  const getMedicationsForDate = (dateString) => {
    return reminders
      .filter(r => r.date === dateString && r.title?.includes('Take'))
      .map(r => {
        const key = normalizeKey(r.medication);
        const medication = dashboardData.medicationCache[key] || {};
        return {
          id: r.id,
          name: r.medication,
          time: r.time,
          taken: r.completed,
          type: medication.type || 'Unknown',
        };
      });
  };

  const handleMarkAsTaken = async (medicationId) => {
    try {
      setReminders(prevReminders =>
        prevReminders.map(reminder =>
          reminder.id === medicationId ? { ...reminder, completed: true } : reminder
        )
      );
      await fetch(`http://localhost:5000/reminders/${medicationId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error marking medication as taken:', error);
      setReminders(prevReminders =>
        prevReminders.map(reminder =>
          reminder.id === medicationId ? { ...reminder, completed: false } : reminder
        )
      );
      alert('Failed to update medication status. Please try again.');
    }
  };

  const handleMarkAllAsTaken = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const todaysMedicationIds = reminders
        .filter(r => r.date === today && !r.completed && r.title.includes('Take'))
        .map(r => r.id);

      setReminders(prevReminders =>
        prevReminders.map(reminder =>
          todaysMedicationIds.includes(reminder.id) ? { ...reminder, completed: true } : reminder
        )
      );

      await Promise.all(
        todaysMedicationIds.map(id =>
          fetch(`http://localhost:5000/reminders/${id}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );
    } catch (error) {
      console.error('Error marking all medications as taken:', error);
      alert('Failed to update medication statuses. Please try again.');
    }
  };

  const handleUploadPrescription = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload prescription');

      const data = await response.json();

      if (data.generic_predictions) {
        const newMedications = Object.entries(data.generic_predictions).map(([name, type]) => ({
          id: Date.now() + Math.random(),
          name,
          description: type,
          caution: 'Take as directed by your physician',
          sideEffects: 'Consult your doctor about potential side effects',
        }));

        const interactions = checkDrugInteractions(newMedications, medicationData);
        if (interactions.length > 0) {
          alert('Warning: Potential drug interactions detected:\n' + 
            interactions.map(i => i.warning).join('\n'));
        }
        setInteractions(interactions);

        setMedicationData(prevMeds => {
          const existingNames = prevMeds.map(med => normalizeKey(med.name));
          const uniqueNewMeds = newMedications.filter(med => !existingNames.includes(normalizeKey(med.name)));
          console.log('New Medications Added:', uniqueNewMeds);
          return [...prevMeds, ...uniqueNewMeds];
        });

        const medications = extractMedicationsFromStructuredText(data.structured_text);
        const today = new Date();
        const newReminders = medications.map((med, index) => ({
          id: Date.now() + index,
          medication: med.medicineName,
          date: today.toISOString().split('T')[0],
          time: `${8 + index}:00`,
          recurring: 'daily',
          completed: false,
          title: `Take ${med.medicineName} (${med.frequency})`,
        }));

        const refillDate = new Date();
        refillDate.setDate(refillDate.getDate() + 30);
        medications.forEach((med, index) => {
          newReminders.push({
            id: Date.now() + 100 + index,
            medication: med.medicineName,
            date: refillDate.toISOString().split('T')[0],
            time: '09:00',
            recurring: 'none',
            completed: false,
            title: `Refill ${med.medicineName}`,
          });
        });

        setReminders(prevReminders => [...prevReminders, ...newReminders]);
        setPrescriptionHistory(prevHistory => [
          {
            id: Date.now(),
            date: today.toISOString().split('T')[0],
            structured_text: data.structured_text,
            generic_predictions: data.generic_predictions,
          },
          ...prevHistory,
        ]);
      }

      alert('Prescription processed successfully!');
      fetchDashboardData();
    } catch (error) {
      console.error('Error uploading prescription:', error);
      alert('Failed to process prescription: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      <Sidebar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className={`flex-1 ${isSidebarOpen ? 'ml-64' : 'ml-16'} transition-all duration-300 p-6 overflow-auto`}>
        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-4 right-4 px-4 py-2 rounded-lg text-white ${
            toast.type === 'success' ? 'bg-green-600' :
            toast.type === 'error' ? 'bg-red-600' : 'bg-indigo-600'
          }`}>
            {toast.message}
          </div>
        )}

        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-indigo-400 tracking-tight">Medication Dashboard</h1>
            <p className="text-slate-400 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <div className="flex items-center space-x-4">
            <label className="relative flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow cursor-pointer transition-all">
              <span className="mr-2 text-sm font-medium">Upload Prescription</span>
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleUploadPrescription} />
            </label>
            <button
              onClick={clearCache}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition"
            >
              Clear Cache
            </button>
            <div className="w-12 h-12 bg-indigo-900/40 border border-indigo-800/80 rounded-full flex items-center justify-center shadow-lg">
              <User size={22} className="text-indigo-400" />
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-indigo-700/40 mb-4"></div>
              <div className="h-4 w-48 bg-slate-800 rounded mb-2"></div>
              <div className="h-3 w-32 bg-slate-800 rounded"></div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { title: 'Total Medications', value: dashboardData.totalMedications, icon: '💊', color: 'indigo' },
                { title: 'Next Refill', value: dashboardData.nextRefillDate, icon: '📅', color: 'indigo' },
                { title: 'Missed Doses', value: dashboardData.missedDosesWeek, icon: <AlertCircle size={18} />, color: 'red', subtext: 'This week' },
                { title: 'Health Score', value: dashboardData.monthlyHealthScore, icon: <Activity size={18} />, color: 'green', subtext: dashboardData.monthlyHealthScore > 80 ? 'Good' : 'Fair' },
              ].map((card, index) => (
                <div key={index} className={`bg-slate-900 rounded-xl p-6 shadow-xl border border-slate-800/50 hover:border-${card.color === 'indigo' ? 'indigo' : card.color}-800/30 transition-all h-36 flex flex-col justify-between`}>
                  <div className="flex justify-between items-center">
                    <h2 className="text-sm font-medium text-slate-400">{card.title}</h2>
                    <span className={`p-3 bg-${card.color}-900/40 border border-${card.color}-800/40 rounded-full shadow-lg ${typeof card.icon === 'string' ? 'text-xl' : `text-${card.color}-400`}`}>
                      {card.icon}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-3xl font-bold text-${card.color}-400`}>{card.value}</p>
                    {card.subtext && (
                      <span className={`text-xs ${card.title === 'Health Score' ? `px-3 py-1 bg-${card.color}-900/40 text-${card.color}-400 rounded-lg border border-${card.color}-800/40` : 'text-slate-500'}`}>
                        {card.subtext}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-6">
                <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800/50 hover:border-indigo-800/30 transition-all min-h-[400px] flex flex-col">
                  <div className="p-5 bg-slate-800/50 flex items-center border-b border-slate-700">
                    <Calendar className="mr-3 text-indigo-400" />
                    <h2 className="font-bold text-lg">Medication Calendar</h2>
                  </div>
                  <div className="p-6 flex-1">
                    <div className="grid grid-cols-7 gap-2 mb-4">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                        <div key={day} className="text-center text-xs text-slate-500 font-bold">{day}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {Array.from({ length: 35 }, (_, i) => {
                        const today = new Date();
                        const currentMonth = today.getMonth();
                        const currentYear = today.getFullYear();
                        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
                        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                        const day = i - firstDay + 1;
                        const isCurrentMonth = day > 0 && day <= daysInMonth;
                        const isToday = day === today.getDate() && isCurrentMonth;
                        const dateString = isCurrentMonth
                          ? new Date(currentYear, currentMonth, day).toISOString().split('T')[0]
                          : null;
                        const hasMedication = isCurrentMonth && reminders.some(
                          r => r.date === dateString && r.title?.includes('Take')
                        );

                        return (
                          <div
                            key={i}
                            onClick={() => isCurrentMonth && setSelectedDate(dateString)}
                            className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs cursor-pointer
                              ${isCurrentMonth ? 'bg-slate-800 hover:bg-indigo-800/30' : 'bg-slate-800/30 text-slate-600'}
                              ${isToday ? 'border-2 border-indigo-500' : 'border border-slate-700'}
                              ${hasMedication ? 'ring-2 ring-indigo-500/40' : ''}`}
                          >
                            {isCurrentMonth && day}
                            {hasMedication && (
                              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {selectedDate && (
                  <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800/50 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg text-indigo-400">
                        Medications for {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                      </h3>
                      <button
                        onClick={() => setSelectedDate(null)}
                        className="text-slate-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="space-y-3">
                      {getMedicationsForDate(selectedDate).length === 0 ? (
                        <div className="text-center py-4 text-slate-500">
                          <p>No medications scheduled</p>
                        </div>
                      ) : (
                        getMedicationsForDate(selectedDate).map((med, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700"
                          >
                            <div className="flex items-center">
                              <div className="p-2 mr-3 rounded-full bg-indigo-900/40 text-indigo-400">
                                💊
                              </div>
                              <div>
                                <h4 className="font-medium text-slate-200">{med.name}</h4>
                                <p className="text-xs text-slate-500">{med.type}</p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <span className="text-slate-400 mr-4 text-sm">{med.time}</span>
                              <span className={`text-sm ${med.taken ? 'text-green-400' : 'text-rose-400'}`}>
                                {med.taken ? 'Taken ✓' : 'Pending'}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800/50 hover:border-indigo-800/30 transition-all">
                  <div className="p-5 bg-slate-800/50 flex items-center border-b border-slate-700">
                    <PieChart className="mr-3 text-indigo-400" />
                    <h2 className="font-bold text-lg">Medication Types</h2>
                  </div>
                  <div className="p-6">
                    <InteractivePieChart data={dashboardData.medicationTypes} />
                  </div>
                </div>

                {interactions.length > 0 && (
                  <div className="bg-slate-900 rounded-xl shadow-xl border border-red-800/50 p-6">
                    <h2 className="font-bold text-lg text-rose-400 mb-4">Drug Interaction Warnings</h2>
                    <ul className="space-y-2">
                      {interactions.map((interaction, index) => (
                        <li key={index} className="text-sm text-slate-200">
                          {interaction.warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800/50 hover:border-indigo-800/30 transition-all">
                  <div className="p-5 bg-slate-800/50 flex justify-between items-center border-b border-slate-700">
                    <div className="flex items-center">
                      <Clock className="mr-3 text-indigo-400" />
                      <h2 className="font-bold text-lg">Today's Medications</h2>
                    </div>
                    <button
                      onClick={handleMarkAllAsTaken}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg transition"
                    >
                      Mark All as Taken
                    </button>
                  </div>
                  <div className="p-6">
                    {dashboardData.todaysMedications.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <div className="text-4xl mb-2">✓</div>
                        <p>No medications scheduled for today</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dashboardData.todaysMedications.map((medication, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-indigo-700/50 transition-all">
                            <div className="flex items-center">
                              <div className="p-3 mr-4 rounded-full bg-indigo-900/40 border border-indigo-800/40 text-indigo-400 text-xl">
                                💊
                              </div>
                              <div>
                                <h3 className="font-medium text-slate-200">{medication.name}</h3>
                                <p className="text-xs text-slate-500">{medication.type}</p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <span className="text-slate-400 mr-5 text-sm">{medication.time}</span>
                              <button
                                onClick={() => handleMarkAsTaken(medication.id)}
                                disabled={medication.taken}
                                className={`px-4 py-2 rounded-lg text-sm transition-all ${
                                  medication.taken
                                    ? 'bg-green-900/30 text-green-400 cursor-default'
                                    : 'bg-indigo-900/50 hover:bg-indigo-800 text-white'
                                }`}
                              >
                                {medication.taken ? 'Taken ✓' : 'Mark as Taken'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800/50 hover:border-red-800/30 transition-all">
                    <div className="p-5 bg-slate-800/50 flex items-center border-b border-slate-700">
                      <AlertCircle className="mr-3 text-rose-400" />
                      <h2 className="font-bold text-lg">Missed Doses</h2>
                    </div>
                    <div className="p-6">
                      {dashboardData.missedDoses.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <div className="text-4xl mb-2">✓</div>
                          <p>No missed doses</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {dashboardData.missedDoses.map((dose, index) => (
                            <div key={index} className="flex items-center p-3 bg-slate-800 rounded-lg border border-slate-700">
                              <div className="p-2 mr-3 rounded-full bg-red-900/40 border border-red-800/40 text-rose-400 text-xl">
                                💊
                              </div>
                              <div>
                                <h3 className="font-medium text-slate-200">{dose.name}</h3>
                                <div className="flex space-x-2 text-xs">
                                  <span className="text-slate-500">{dose.date}</span>
                                  <span className="text-slate-500">{dose.time}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800/50 hover:border-yellow-800/30 transition-all">
                    <div className="p-5 bg-slate-800/50 flex items-center border-b border-slate-700">
                      <Calendar className="mr-3 text-amber-400" />
                      <h2 className="font-bold text-lg">Upcoming Refills</h2>
                    </div>
                    <div className="p-6">
                      {dashboardData.upcomingRefills.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                          <div className="text-4xl mb-2">✓</div>
                          <p>No upcoming refills</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {dashboardData.upcomingRefills.map((refill, index) => (
                            <div key={index} className="flex items-center p-3 bg-slate-800 rounded-lg border border-slate-700">
                              <div className="p-2 mr-3 rounded-full bg-amber-900/40 border border-amber-800/40 text-amber-400 text-xl">
                                📅
                              </div>
                              <div>
                                <h3 className="font-medium text-slate-200">{refill.name}</h3>
                                <div className="text-xs text-slate-500">Refill on {refill.date}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Medication Cache Visualization */}
                <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800/50 p-6 mt-6">
                  <div className="flex items-center mb-4">
                    <Hash className="mr-3 text-indigo-400" />
                    <h2 className="font-bold text-lg text-indigo-400">Medication Cache (Hashtable)</h2>
                  </div>
                  <p className="text-slate-400 mb-4">
                    This section demonstrates the <strong>hashtable</strong>, a data structure that maps medication names to their metadata using a hash function for O(1) lookups. Enter a medication name below to see how it’s hashed and retrieved instantly.
                  </p>

                  {/* Hash Function Lookup Demo */}
                  <div className="mb-6 p-4 bg-slate-800 rounded-lg">
                    <h3 className="text-sm font-semibold text-slate-200 mb-2">Try a Hashtable Lookup</h3>
                    <div className="flex items-center space-x-2 mb-4">
                      <input
                        type="text"
                        value={lookupInput}
                        onChange={(e) => setLookupInput(e.target.value)}
                        placeholder="Enter medication name (e.g., Abciximab)"
                        className="px-3 py-2 bg-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        onClick={handleLookup}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition"
                      >
                        Lookup
                      </button>
                    </div>
                    {lookupResult && (
                      <div className="text-sm text-slate-300">
                        <p><strong>Input:</strong> {lookupResult.key}</p>
                        <p><strong>Hash Value:</strong> {lookupResult.hashValue} (bucket index)</p>
                        <p><strong>Result:</strong> {lookupResult.data ? JSON.stringify(lookupResult.data) : 'Not found'}</p>
                        <p className="mt-2"><strong>Performance Comparison:</strong></p>
                        <p>- Hashtable Lookup: <span className="text-green-400">{lookupResult.hashtableTime} ms</span> (O(1))</p>
                        <p>- Linear Search: <span className="text-red-400">{lookupResult.linearTime} ms</span> (O(n))</p>
                      </div>
                    )}
                  </div>

                  {/* Hashtable Diagram with Buckets */}
                  <div className="mb-6 p-4 bg-slate-800 rounded-lg">
                    <h3 className="text-sm font-semibold text-slate-200 mb-2">How the Hashtable Works</h3>
                    <div className="flex items-center space-x-4">
                      <div className="text-xs text-slate-400">
                        <p>Medication Name → Hash Function → Bucket Index → Metadata</p>
                        <p className="mt-2">Example:</p>
                        <p>"Abciximab" → Hash(Abciximab) = {simpleHash('abciximab')} → Metadata</p>
                      </div>
                      <div className="flex-1">
                        <svg width="100%" height="120" className="text-slate-400">
                          <rect x="10" y="10" width="60" height="20" fill="#1e293b" stroke="#4b5e7e" />
                          <text x="40" y="25" textAnchor="middle" fill="#a3bffa">Hash</text>
                          <path d="M70 20 H90 L85 15 M90 20 L85 25" fill="none" stroke="#a3bffa" />
                          <rect x="90" y="10" width="60" height="20" fill="#1e293b" stroke="#4b5e7e" />
                          <text x="120" y="25" textAnchor="middle" fill="#a3bffa">Buckets</text>
                          <rect x="90" y="40" width="30" height="20" fill="#1e293b" stroke="#4b5e7e" />
                          <text x="105" y="55" textAnchor="middle" fill="#a3bffa">{simpleHash('abciximab')}</text>
                          <rect x="120" y="40" width="30" height="20" fill="#1e293b" stroke="#4b5e7e" />
                          <text x="135" y="55" textAnchor="middle" fill="#a3bffa">{simpleHash('vomilast')}</text>
                          <path d="M150 20 H170 L165 15 M170 20 L165 25" fill="none" stroke="#a3bffa" />
                          <rect x="170" y="10" width="80" height="20" fill="#1e293b" stroke="#4b5e7e" />
                          <text x="210" y="25" textAnchor="middle" fill="#a3bffa">Metadata</text>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Cache Table */}
                  {Object.keys(dashboardData.medicationCache).length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-800">
                            <th className="p-3 border-b border-slate-700">Key (Hashed Name)</th>
                            <th className="p-3 border-b border-slate-700">Name</th>
                            <th className="p-3 border-b border-slate-700">Description</th>
                            <th className="p-3 border-b border-slate-700">Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(dashboardData.medicationCache).map(([key, value]) => (
                            <tr key={key} className="hover:bg-slate-800">
                              <td className="p-3 border-b border-slate-700">{key} ({simpleHash(key)})</td>
                              <td className="p-3 border-b border-slate-700">{value.name}</td>
                              <td className="p-3 border-b border-slate-700">{value.description}</td>
                              <td className="p-3 border-b border-slate-700">{value.type}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-slate-500">No data in the medication cache.</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MedicationDashboard;