import React, { useState } from 'react';
import { Calendar, Clock, AlertCircle, DollarSign, PieChart, Activity, Menu, X, Home, Settings, User, FileText, HelpCircle, LogOut } from 'lucide-react';
import Sidebar from '../../components/sidebar';
const MedicationDashboard = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeSegment, setActiveSegment] = useState(null);
  
  const [data, setData] = useState({
    totalMedications: 12,
    nextRefillDate: "April 3, 2025",
    missedDosesWeek: 2,
    monthlyHealthScore: 87,
    medicationCost: 143.75,
    medicationTypes: [
      { name: "Painkillers", percentage: 30, color: "#FF6B6B", count: 3, emoji: "🩹" },
      { name: "Antibiotics", percentage: 20, color: "#4ECDC4", count: 2, emoji: "💊" },
      { name: "Hormonal", percentage: 10, color: "#FF9F1C", count: 1, emoji: "🧬" },
      { name: "Cardiovascular", percentage: 15, color: "#8675A9", count: 2, emoji: "❤️" },
      { name: "Neurological", percentage: 10, color: "#5D93E1", count: 1, emoji: "🧠" },
      { name: "Others", percentage: 15, color: "#D3D3D3", count: 3, emoji: "🏥" }
    ],
    todaysMedications: [
      { name: "Lisinopril", time: "8:00 AM", taken: true, type: "Cardiovascular" },
      { name: "Metformin", time: "1:00 PM", taken: false, type: "Endocrine" },
      { name: "Atorvastatin", time: "8:00 PM", taken: false, type: "Cardiovascular" }
    ],
    missedDoses: [
      { name: "Metformin", date: "Mar 28", time: "1:00 PM", type: "Endocrine" },
      { name: "Lisinopril", date: "Mar 29", time: "8:00 AM", type: "Cardiovascular" }
    ],
    upcomingRefills: [
      { name: "Lisinopril", date: "Apr 3" },
      { name: "Metformin", date: "Apr 12" },
      { name: "Atorvastatin", date: "Apr 22" }
    ]
  });

  const InteractivePieChart = ({ data: chartData }) => {
    let cumulativeAngle = 0;
    
    const handleSegmentHover = (index) => setActiveSegment(index);
    const handleSegmentLeave = () => setActiveSegment(null);
    
    return (
      <div className="relative w-full aspect-square">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            {chartData.map((segment, index) => (
              <filter key={`shadow-${index}`} id={`shadow-${index}`} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor={segment.color} floodOpacity="0.5"/>
              </filter>
            ))}
          </defs>
          
          {chartData.map((segment, index) => {
            const startAngle = cumulativeAngle;
            cumulativeAngle += segment.percentage * 3.6;
            const endAngle = cumulativeAngle;
            
            const startRad = (startAngle - 90) * Math.PI / 180;
            const endRad = (endAngle - 90) * Math.PI / 180;
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
                  fill={segment.color}
                  stroke="#1a1e2e"
                  strokeWidth="0.5"
                  onMouseEnter={() => handleSegmentHover(index)}
                  onMouseLeave={handleSegmentLeave}
                  filter={activeSegment === index ? `url(#shadow-${index})` : ''}
                  className="transition-all duration-300 cursor-pointer"
                  style={{ transform: activeSegment === index ? 'scale(1.05)' : 'scale(1)', transformOrigin: '50% 50%' }}
                />
                {segment.percentage >= 8 && (
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize={activeSegment === index ? "6" : "4"}
                    fontWeight="bold"
                    style={{ textShadow: '0px 0px 2px rgba(0,0,0,0.8)', transition: 'all 0.3s ease' }}
                  >
                    {segment.percentage}%
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
              <div className="text-lg font-bold text-blue-400">{data.totalMedications}</div>
              <div className="text-xs text-gray-400">medications</div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar Component */}
      <Sidebar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      {/* Main Content */}
      <div className={`flex-1 ${isSidebarOpen ? 'ml-64' : 'ml-16'} transition-all duration-300 p-6 overflow-auto`}>
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-indigo-400 tracking-tight">Medication Dashboard</h1>
            <p className="text-slate-400 mt-1">Sunday, March 30, 2025</p>
          </div>
          <div className="w-12 h-12 bg-indigo-900/40 border border-indigo-800/80 rounded-full flex items-center justify-center shadow-lg">
            <User size={22} className="text-indigo-400" />
          </div>
        </header>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { title: "Total Medications", value: data.totalMedications, icon: "💊", color: "indigo" },
            { title: "Next Refill", value: data.nextRefillDate, icon: "📅", color: "indigo" },
            { title: "Missed Doses", value: data.missedDosesWeek, icon: <AlertCircle size={18} />, color: "red", subtext: "This week" },
            { title: "Health Score", value: data.monthlyHealthScore, icon: <Activity size={18} />, color: "green", subtext: "Good" }
          ].map((card, index) => (
            <div key={index} className={`bg-slate-900 rounded-xl p-6 shadow-xl border border-slate-800/50 hover:border-${card.color}-800/30 transition-all h-36 flex flex-col justify-between`}>
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-medium text-slate-400">{card.title}</h2>
                <span className={`p-3 bg-${card.color}-900/40 border border-${card.color}-800/40 rounded-full shadow-lg ${typeof card.icon === 'string' ? 'text-xl' : `text-${card.color}-400`}`}>
                  {card.icon}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className={`text-3xl font-bold text-${card.color}-400`}>{card.value}</p>
                {card.subtext && (
                  <span className={`text-xs ${card.title === 'Health Score' ? 'px-3 py-1 bg-green-900/40 text-green-400 rounded-lg border border-green-800/40' : 'text-slate-500'}`}>
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
                    const day = i < 4 ? i + 28 : (i - 3);
                    const isCurrentMonth = i >= 4 && i < 35;
                    const isToday = isCurrentMonth && day === 30;
                    const hasMissedDose = (day === 28 || day === 29) && i < 4;
                    const hasRefill = day === 3 && isCurrentMonth;
                    return (
                      <div key={i} className={`text-center p-2 rounded-lg text-sm relative group cursor-pointer ${isCurrentMonth ? '' : 'text-slate-600'} ${isToday ? 'bg-indigo-900/70 border border-indigo-400 shadow-lg' : 'bg-slate-800 hover:bg-slate-700'} ${hasMissedDose ? 'border border-red-400 shadow-lg' : ''} ${hasRefill ? 'border border-green-400 shadow-lg' : ''}`}>
                        <span className="relative z-10">{day}</span>
                        {(hasMissedDose || hasRefill || isToday) && (
                          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex space-x-1">
                            {hasMissedDose && <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>}
                            {hasRefill && <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>}
                            {isToday && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>}
                          </div>
                        )}
                        {(hasMissedDose || hasRefill) && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-32 p-2 bg-slate-800 border border-slate-700 rounded-lg shadow-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                            {hasMissedDose && <p className="text-red-400">Missed dose</p>}
                            {hasRefill && <p className="text-green-400">Refill due</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800/50 hover:border-yellow-800/30 transition-all min-h-[400px] flex flex-col">
              <div className="p-5 bg-slate-800/50 flex items-center justify-between border-b border-slate-700">
                <div className="flex items-center">
                  <DollarSign className="mr-3 text-yellow-400" />
                  <h2 className="font-bold text-lg">Medication Expenses</h2>
                </div>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">Month</button>
                  <button className="px-3 py-1 text-xs bg-slate-700 text-yellow-400 border border-yellow-800/50 rounded-lg transition-colors">Year</button>
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">This Month</p>
                    <p className="text-3xl font-bold text-yellow-400">${data.medicationCost}</p>
                    <p className="text-xs text-green-400 mt-1">↓ $13.50 from last month</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 mb-1">Annual Est.</p>
                    <p className="text-xl font-medium text-slate-300">$1,752.00</p>
                    <p className="text-xs text-slate-400 mt-1">$146.00/month avg</p>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-slate-400 mb-2">
                    <span>Expense Breakdown</span>
                    <span>% of Total</span>
                  </div>
                  {[
                    { name: "Cardiovascular", amount: 52.40, color: "blue", percent: 36 },
                    { name: "Painkillers", amount: 43.85, color: "red", percent: 31 },
                    { name: "Antibiotics", amount: 28.10, color: "teal", percent: 19 },
                    { name: "Others", amount: 19.40, color: "gray", percent: 14 }
                  ].map((item, index) => (
                    <div key={index} className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium flex items-center">
                          <span className={`w-2 h-2 bg-${item.color}-500 rounded-full mr-2`}></span>
                          {item.name}
                        </span>
                        <span>${item.amount}</span>
                      </div>
                      <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                        <div className={`absolute top-0 left-0 h-full bg-${item.color}-500`} style={{ width: `${item.percent}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-4 p-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl transition-colors text-sm font-medium shadow-lg border border-yellow-500 flex items-center justify-center">
                  <FileText size={16} className="mr-2" />
                  View Expense Report
                </button>
              </div>
            </div>
          </div>

          {/* Middle Column */}
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800/50 hover:border-indigo-800/30 transition-all min-h-[400px] flex flex-col">
              <div className="p-5 bg-slate-800/50 flex items-center border-b border-slate-700">
                <Clock className="mr-3 text-indigo-400" />
                <h2 className="font-bold text-lg">Today's Medications</h2>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="space-y-4 flex-1">
                  {data.todaysMedications.map((med, index) => (
                    <div key={index} className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${med.taken ? 'bg-green-900/20 border border-green-800/50 shadow-lg' : 'bg-slate-800 hover:bg-slate-700 cursor-pointer border border-slate-700/50'}`}>
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${med.taken ? 'bg-green-500' : 'bg-slate-500'}`}></div>
                        <div>
                          <p className="font-medium">{med.name}</p>
                          <p className="text-xs text-slate-400">{med.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{med.time}</p>
                        <p className={`text-xs ${med.taken ? 'text-green-400' : 'text-slate-400'}`}>{med.taken ? 'Taken' : 'Upcoming'}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-4 p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors text-sm font-medium shadow-lg border border-indigo-500">
                  Mark All as Taken
                </button>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800/50 hover:border-red-800/30 transition-all min-h-[400px] flex flex-col">
              <div className="p-5 bg-slate-800/50 flex items-center border-b border-slate-700">
                <AlertCircle className="mr-3 text-red-400" />
                <h2 className="font-bold text-lg">Missed Doses</h2>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                {data.missedDoses.length > 0 ? (
                  <div className="space-y-4 flex-1">
                    {data.missedDoses.map((med, index) => (
                      <div key={index} className="flex items-center justify-between bg-red-900/20 border border-red-800/50 p-4 rounded-xl hover:bg-red-900/30 transition-colors cursor-pointer shadow-lg">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                          <div>
                            <p className="font-medium">{med.name}</p>
                            <p className="text-xs text-slate-400">{med.type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{med.date} - {med.time}</p>
                          <p className="text-xs text-red-400">Missed</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-6 flex-1 flex items-center justify-center">No missed doses. Great job!</p>
                )}
                {data.missedDoses.length > 0 && (
                  <button className="w-full mt-4 p-3 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors text-sm font-medium shadow-lg border border-red-500">
                    Reschedule Missed Doses
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800/50 hover:border-indigo-800/30 transition-all min-h-[400px] flex flex-col">
              <div className="p-5 bg-slate-800/50 flex items-center border-b border-slate-700">
                <PieChart className="mr-3 text-indigo-400" />
                <h2 className="font-bold text-lg">Medication Types</h2>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="mb-6 flex-1 flex items-center">
                  <InteractivePieChart data={data.medicationTypes} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {data.medicationTypes.map((type, index) => (
                    <div key={index} className={`flex items-center p-3 rounded-xl transition-all duration-300 cursor-pointer border ${activeSegment === index ? 'bg-slate-800 shadow-lg' : 'bg-slate-900 hover:bg-slate-800 border-slate-800/50'}`} style={{ borderColor: activeSegment === index ? type.color + '80' : '' }} onMouseEnter={() => setActiveSegment(index)} onMouseLeave={() => setActiveSegment(null)}>
                      <div className="mr-3 text-xl">{type.emoji}</div>
                      <div>
                        <p className="text-xs font-medium">{type.name}</p>
                        <p className="text-xs text-slate-400">{type.percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800/50 hover:border-green-800/30 transition-all min-h-[400px] flex flex-col">
              <div className="p-5 bg-slate-800/50 flex items-center border-b border-slate-700">
                <Calendar className="mr-3 text-green-400" />
                <h2 className="font-bold text-lg">Upcoming Refills</h2>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="space-y-4 flex-1">
                  {data.upcomingRefills.map((refill, index) => (
                    <div key={index} className="flex items-center justify-between bg-slate-800 p-4 rounded-xl hover:bg-slate-700 transition-colors cursor-pointer group border border-slate-700/50">
                      <p className="font-medium">{refill.name}</p>
                      <div className="px-3 py-1 bg-green-900/40 text-green-400 rounded-lg text-xs font-medium group-hover:bg-green-800/40 transition-colors border border-green-800/50">
                        {refill.date}
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-4 p-3 bg-green-600 hover:bg-green-500 text-white rounded-xl transition-colors text-sm font-medium shadow-lg border border-green-500">
                  Schedule New Refill
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicationDashboard;