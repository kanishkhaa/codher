import React, { useState, useEffect, useContext } from 'react';
import { Calendar, Clock, AlertCircle, PieChart, Activity, User } from 'lucide-react';
import Sidebar from '../../components/sidebar';
import { AppContext } from '../context/AppContext.jsx'; // Ensure correct path

const MedicationDashboard = () => {
  const { prescriptionHistory, setPrescriptionHistory, medicationData, setMedicationData, reminders, setReminders } = useContext(AppContext);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeSegment, setActiveSegment] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    totalMedications: 0,
    nextRefillDate: 'N/A',
    missedDosesWeek: 0,
    monthlyHealthScore: 0,
    medicationTypes: [],
    todaysMedications: [],
    missedDoses: [],
    upcomingRefills: [],
  });
  const [loading, setLoading] = useState(true);

  // Fetch initial data is handled by AppContext, so we only need to process dashboard data
  useEffect(() => {
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

      // Total Medications
      const totalMedications = medicationData.length;

      // Next Refill Date
      const upcomingRefills = reminders
        .filter(r => r.recurring === 'none' && r.title.includes('Refill'))
        .map(r => ({
          name: r.medication,
          date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      const nextRefillDate = upcomingRefills[0]?.date || 'N/A';

      // Missed Doses This Week
      const missedDoses = reminders
        .filter(r => {
          const reminderDate = new Date(r.date);
          return (
            reminderDate >= oneWeekAgo &&
            reminderDate <= new Date() &&
            !r.completed &&
            typeof r.title === "string" && (r.title.includes('Take') || r.title.toLowerCase().includes('dose'))
          );
        })
        .map(r => {
          const medication = medicationData.find(m => m.name === r.medication) || {};
          return {
            id: r.id,
            name: r.medication,
            date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            time: r.time,
            type: medication.description || 'Unknown',
          };
        });
      const missedDosesWeek = missedDoses.length;

      // Monthly Health Score
      const monthlyHealthScore = Math.min(100, Math.max(0, 100 - missedDosesWeek * 5));

      // Medication Types
      const typeCounts = {};
      medicationData.forEach(med => {
        let type = 'Others';
        if (!med.description) {
          type = 'Others';
        } else if (med.description.toLowerCase().includes('antibiotic')) {
          type = 'Antibiotics';
        } else if (med.description.toLowerCase().includes('pain') || med.description.toLowerCase().includes('nsaid')) {
          type = 'Painkillers';
        } else if (med.description.toLowerCase().includes('cardio') || med.description.toLowerCase().includes('blood pressure') || med.description.toLowerCase().includes('heart') || med.description.toLowerCase().includes('ace inhibitor')) {
          type = 'Cardiovascular';
        } else if (med.description.toLowerCase().includes('neuro') || med.description.toLowerCase().includes('brain')) {
          type = 'Neurological';
        } else if (med.description.toLowerCase().includes('hormon') || med.description.toLowerCase().includes('diabetes') || med.description.toLowerCase().includes('biguanide')) {
          type = 'Hormonal';
        } else if (med.description.toLowerCase().includes('cholesterol') || med.description.toLowerCase().includes('statin')) {
          type = 'Cholesterol';
        }
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      const totalTypes = Object.values(typeCounts).reduce((sum, count) => sum + count, 0);
      const medicationTypes = Object.entries(typeCounts).map(([name, count]) => ({
        name,
        percentage: Math.round((count / totalTypes) * 100),
        color: name === 'Painkillers' ? '#FF6B6B' :
               name === 'Antibiotics' ? '#4ECDC4' :
               name === 'Hormonal' ? '#FF9F1C' :
               name === 'Cardiovascular' ? '#8675A9' :
               name === 'Neurological' ? '#5D93E1' :
               name === 'Cholesterol' ? '#45B7D1' : '#D3D3D3',
        count,
        emoji: name === 'Painkillers' ? '🩹' :
               name === 'Antibiotics' ? '💊' :
               name === 'Hormonal' ? '🧬' :
               name === 'Cardiovascular' ? '❤️' :
               name === 'Neurological' ? '🧠' :
               name === 'Cholesterol' ? '📉' : '🏥',
      }));

      // Today's Medications
      const todaysMedications = reminders
      .filter(r => isToday(r.date) && r.title?.includes('Take'))

        .map(r => {
          const medication = medicationData.find(m => m.name === r.medication) || {};
          return {
            id: r.id,
            name: r.medication,
            time: r.time,
            taken: r.completed,
            type: medication.description || 'Unknown',
          };
        });

      setDashboardData({
        totalMedications,
        nextRefillDate,
        missedDosesWeek,
        monthlyHealthScore,
        medicationTypes,
        todaysMedications,
        missedDoses,
        upcomingRefills,
      });
      setLoading(false);
    };

    if (prescriptionHistory.length > 0 || medicationData.length > 0 || reminders.length > 0) {
      deriveDashboardData();
    } else {
      setLoading(false); // If no data, stop loading
    }
  }, [prescriptionHistory, medicationData, reminders]);

  const extractMedicationsFromStructuredText = (structuredText) => {
    if (!structuredText || typeof structuredText !== 'string') {
      return [];
    }

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
  const InteractivePieChart = ({ data: chartData }) => {
    const [activeSegment, setActiveSegment] = useState(null);
  
    // Log the incoming data for debugging
    console.log('PieChart Data:', chartData);
  
    // Handle edge cases
    if (!chartData || chartData.length === 0 || chartData.every(segment => segment.percentage === 0)) {
      return (
        <div className="relative w-full aspect-square flex items-center justify-center text-slate-500">
          <p>No medication types to display</p>
        </div>
      );
    }
  
    let cumulativeAngle = 0;
  
    const handleSegmentHover = (index) => setActiveSegment(index);
    const handleSegmentLeave = () => setActiveSegment(null);
  
    return (
      <div className="relative w-full aspect-square">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            {chartData.map((segment, index) => (
              <filter key={`shadow-${index}`} id={`shadow-${index}`} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor={segment.color} floodOpacity="0.5" />
              </filter>
            ))}
          </defs>
          {chartData.map((segment, index) => {
            const startAngle = cumulativeAngle;
            const percentage = Math.max(segment.percentage, 1); // Ensure minimum percentage for visibility
            cumulativeAngle += percentage * 3.6; // 360 degrees / 100% = 3.6 degrees per percent
            const endAngle = cumulativeAngle;
  
            const startRad = ((startAngle - 90) * Math.PI) / 180;
            const endRad = ((endAngle - 90) * Math.PI) / 180;
            const midRad = (startRad + endRad) / 2;
            const midX = 50 + (activeSegment === index ? 5 : 0) * Math.cos(midRad);
            const midY = 50 + (activeSegment === index ? 5 : 0) * Math.sin(midRad);
            const radius = activeSegment === index ? 45 : 40;
            const x1 = midX + radius * Math.cos(startRad);
            const y1 = midY + radius * Math.sin(startRad);
            const x2 = midX + radius * Math.cos(endRad);
            const y2 = midY + radius * Math.sin(endRad);
            const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
            const path = `M ${midX} ${midY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  
            const labelRadius = radius * 0.7;
            const labelX = midX + labelRadius * Math.cos(midRad);
            const labelY = midY + labelRadius * Math.sin(midRad);
  
            return (
              <g key={index}>
                <path
                  d={path}
                  fill={segment.color || '#D3D3D3'} // Fallback color
                  stroke="#1a1e2e"
                  strokeWidth="0.5"
                  onMouseEnter={() => handleSegmentHover(index)}
                  onMouseLeave={handleSegmentLeave}
                  filter={activeSegment === index ? `url(#shadow-${index})` : ''}
                  className="transition-all duration-300 cursor-pointer"
                  style={{ transform: activeSegment === index ? 'scale(1.05)' : 'scale(1)', transformOrigin: '50% 50%' }}
                />
                {percentage >= 8 && (
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize={activeSegment === index ? '6' : '4'}
                    fontWeight="bold"
                    style={{ textShadow: '0px 0px 2px rgba(0,0,0,0.8)', transition: 'all 0.3s ease' }}
                  >
                    {percentage}%
                  </text>
                )}
              </g>
            );
          })}
          <circle cx="50" cy="50" r="20" fill="#1e293b" stroke="#0f172a" strokeWidth="0.5">
            <animate attributeName="r" from="19" to="20" dur="2s" repeatCount="indefinite" />
          </circle>
        </svg>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          {activeSegment !== null ? (
            <>
              <div className="text-4xl mb-1">{chartData[activeSegment].emoji}</div>
              <div className="text-xs font-bold">{chartData[activeSegment].name}</div>
              <div className="text-lg font-bold text-blue-400">{chartData[activeSegment].percentage}%</div>
              <div className="text-xs text-gray-400">{chartData[activeSegment].count} meds</div>
            </>
          ) : (
            <>
              <div className="text-2xl mb-1">💊</div>
              <div className="text-xs font-bold">Total</div>
              <div className="text-lg font-bold text-blue-400">{dashboardData.totalMedications}</div>
              <div className="text-xs text-gray-400">medications</div>
            </>
          )}
        </div>
      </div>
    );
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

      if (!response.ok) {
        throw new Error('Failed to upload prescription');
      }

      const data = await response.json();

      // Update medication data
      if (data.generic_predictions) {
        const newMedications = Object.entries(data.generic_predictions).map(([name, type]) => ({
          id: Date.now() + Math.random(),
          name,
          description: type,
          caution: 'Take as directed by your physician',
          sideEffects: 'Consult your doctor about potential side effects',
        }));

        setMedicationData(prevMeds => {
          const existingNames = prevMeds.map(med => med.name);
          const uniqueNewMeds = newMedications.filter(med => !existingNames.includes(med.name));
          return [...prevMeds, ...uniqueNewMeds];
        });

        // Extract medications from structured text
        const medications = extractMedicationsFromStructuredText(data.structured_text);

        // Create reminders for new medications
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

        // Add refill reminders
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

        // Update prescription history
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
            {/* Removed Latest Prescription Summary since it’s handled in PrescriptionAnalyzer */}
            {/* KPI Cards */}
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

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
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
                        const hasMedication = isCurrentMonth && dashboardData.todaysMedications.some(
                          med => new Date(med.date).getDate() === day
                        );

                        return (
                          <div
                            key={i}
                            className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs 
                              ${isCurrentMonth ? 'bg-slate-800' : 'bg-slate-800/30 text-slate-600'} 
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

                <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800/50 hover:border-indigo-800/30 transition-all">
                  <div className="p-5 bg-slate-800/50 flex items-center border-b border-slate-700">
                    <PieChart className="mr-3 text-indigo-400" />
                    <h2 className="font-bold text-lg">Medication Types</h2>
                  </div>
                  <div className="p-6">
                    <InteractivePieChart data={dashboardData.medicationTypes} />
                  </div>
                </div>
              </div>

              {/* Right Column (spans 2 columns) */}
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
                    <div className="p-6 ">
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
  <div className="p-6"> {/* Removed max-h-64 and overflow-y-auto */}
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
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MedicationDashboard;