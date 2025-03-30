import React, { useState, useEffect } from 'react';
import { 
  Bell, Calendar, Check, ChevronRight, Clock, Edit, 
  Menu, PlusCircle, X, Info, AlertCircle, Zap, 
  RefreshCw, Search, Settings, User, Home, Pill
} from 'lucide-react';
import Sidebar from '../../components/sidebar'; // New import

const Reminders = () => {
  const [activeTab, setActiveTab] = useState('today');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [currentDate] = useState(new Date());
  
  // Sample medication data
  const [medications, setMedications] = useState([
    { id: 1, name: 'Lisinopril', dosage: '10mg', time: '08:00', taken: true, notes: 'Take with food', category: 'Blood Pressure' },
    { id: 2, name: 'Metformin', dosage: '500mg', time: '13:00', taken: false, notes: 'Take after lunch', category: 'Diabetes' },
    { id: 3, name: 'Simvastatin', dosage: '20mg', time: '20:00', taken: null, notes: 'Take at bedtime', category: 'Cholesterol' },
    { id: 4, name: 'Vitamin D', dosage: '1000IU', time: '09:00', taken: true, notes: '', category: 'Supplement' }
  ]);

  const adherenceRate = () => {
    const taken = medications.filter(med => med.taken === true).length;
    const total = medications.filter(med => med.taken !== null).length;
    return total > 0 ? Math.round((taken / total) * 100) : 0;
  };

  const toggleMedicationStatus = (id, status) => {
    setMedications(medications.map(med => 
      med.id === id ? {...med, taken: status} : med
    ));
  };

  const getMedicationsByTimeGroup = () => {
    const morning = medications.filter(med => {
      const hour = parseInt(med.time.split(':')[0]);
      return hour >= 5 && hour < 12;
    });
    
    const afternoon = medications.filter(med => {
      const hour = parseInt(med.time.split(':')[0]);
      return hour >= 12 && hour < 17;
    });
    
    const evening = medications.filter(med => {
      const hour = parseInt(med.time.split(':')[0]);
      return hour >= 17 && hour < 24 || hour < 5;
    });
    
    return { morning, afternoon, evening };
  };

  const timeGroups = getMedicationsByTimeGroup();
  
  const getCurrentTimePeriod = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    return 'evening';
  };

  const currentPeriod = getCurrentTimePeriod();

  // Format date
  const formatDate = (date) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  // Color mapping for categories
  const getCategoryColor = (category) => {
    switch(category) {
      case 'Blood Pressure': return { bg: 'bg-blue-600', text: 'text-blue-100', light: 'bg-blue-500/20' };
      case 'Diabetes': return { bg: 'bg-red-600', text: 'text-red-100', light: 'bg-red-500/20' };
      case 'Cholesterol': return { bg: 'bg-yellow-600', text: 'text-yellow-100', light: 'bg-yellow-500/20' };
      case 'Supplement': return { bg: 'bg-purple-600', text: 'text-purple-100', light: 'bg-purple-500/20' };
      default: return { bg: 'bg-purple-600', text: 'text-purple-100', light: 'bg-purple-500/20' };
    }
  };

  // Stat Card Component
  const StatCard = ({ icon, title, value, subtext, color, bgColor }) => (
    <div className="bg-gray-800 p-5 rounded-xl shadow-lg border border-gray-700 transition-all duration-300 hover:shadow-xl hover:border-purple-500">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
          <div className={`p-2 ${bgColor} rounded-md mr-3`}>
            {icon}
          </div>
          <p className="text-gray-300 font-medium">{title}</p>
        </div>
        <button className="text-gray-400 hover:text-gray-300">
          <Info size={16} />
        </button>
      </div>
      <p className="text-3xl font-bold text-white mt-2">{value}</p>
      <div className="flex items-center mt-2">
        <div className={`text-sm ${color} flex items-center`}>
          {subtext.icon}
          <span className="ml-1">{subtext.text}</span>
        </div>
      </div>
    </div>
  );

  // Medication Card Component
  const MedicationCard = ({ med, onToggleStatus }) => {
    const categoryColor = getCategoryColor(med.category);
    
    return (
      <div 
        className={`bg-gray-800 rounded-xl p-4 border transition-all duration-300 ${
          med.taken === true ? 'border-green-500 bg-green-900/10' : 
          med.taken === false ? 'border-red-500 bg-red-900/10' : 
          'border-gray-700 hover:border-purple-500'
        }`}
      >
        <div className="flex justify-between items-start">
          <div className="flex items-start">
            <div className="mr-3 mt-1">
              {med.taken === true ? (
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <Check size={14} className="text-white" />
                </div>
              ) : med.taken === false ? (
                <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                  <X size={14} className="text-white" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-dashed"></div>
              )}
            </div>
            
            <div>
              <div className="flex items-center flex-wrap">
                <span className="text-white font-semibold text-lg">{med.name}</span>
                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-700 rounded-md">{med.dosage}</span>
                <span className={`ml-2 px-2 py-0.5 text-xs ${categoryColor.light} ${categoryColor.text} rounded-md`}>
                  {med.category}
                </span>
              </div>
              
              <div className="flex items-center mt-1 text-sm text-gray-400">
                <Clock size={14} className="mr-1" />
                <span>{med.time}</span>
                {med.notes && (
                  <>
                    <span className="mx-2">•</span>
                    <span>{med.notes}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {med.taken === null ? (
              <>
                <button 
                  onClick={() => onToggleStatus(med.id, true)}
                  className="p-2 bg-gray-700 rounded-lg hover:bg-green-700 transition-colors"
                  aria-label="Mark as taken"
                >
                  <Check size={16} className="text-green-400" />
                </button>
                <button 
                  onClick={() => onToggleStatus(med.id, false)}
                  className="p-2 bg-gray-700 rounded-lg hover:bg-red-700 transition-colors"
                  aria-label="Mark as missed"
                >
                  <X size={16} className="text-red-400" />
                </button>
              </>
            ) : (
              <button
                onClick={() => onToggleStatus(med.id, null)}
                className={`px-3 py-1 rounded-lg text-xs font-medium ${
                  med.taken ? 'bg-green-700 text-green-200' : 'bg-red-700 text-red-200'
                }`}
              >
                {med.taken ? 'Taken' : 'Missed'}
              </button>
            )}
            <button className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors" aria-label="Edit medication">
              <Edit size={16} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Time Period Section
  const TimePeriodSection = ({ period, meds, isCurrentPeriod, onToggleStatus }) => {
    const periodColors = {
      morning: 'bg-yellow-400',
      afternoon: 'bg-orange-400',
      evening: 'bg-blue-400'
    };
    
    return (
      <div className={`${isCurrentPeriod ? 'ring-2 ring-purple-500' : ''} rounded-xl bg-gray-800/70 p-6 shadow-lg transition-all duration-300 hover:shadow-xl`}>
        <div className="flex items-center mb-4">
          <div className={`w-3 h-3 rounded-full mr-2 ${periodColors[period]}`}></div>
          <h3 className="text-lg font-semibold capitalize">{period}</h3>
          <div className="ml-3 px-2 py-1 rounded-md bg-gray-700 text-xs text-gray-300">
            {meds.length} medications
          </div>
          {isCurrentPeriod && (
            <span className="ml-3 px-2 py-1 text-xs bg-purple-900/30 text-purple-300 rounded-full">
              Current
            </span>
          )}
        </div>
        
        <div className="space-y-3">
          {meds.length === 0 ? (
            <div className="text-center py-6 text-gray-400 bg-gray-800/50 rounded-lg border border-dashed border-gray-700">
              <p>No medications scheduled</p>
            </div>
          ) : (
            meds.map((med) => (
              <MedicationCard 
                key={med.id}
                med={med}
                onToggleStatus={onToggleStatus}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  // Weekly Chart
  const WeeklySummary = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Weekly Summary</h2>
        <div className="text-sm bg-gray-800 px-3 py-1 rounded-lg text-gray-300 font-medium">
          Mar 24 - Mar 30
        </div>
      </div>
      
      <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold flex items-center">
            <Calendar size={18} className="mr-2 text-purple-400" />
            Weekly Adherence
          </h3>
          <div className="text-sm px-3 py-1 bg-purple-900/30 rounded-full text-purple-300 font-medium">86% overall</div>
        </div>
        
        <div className="grid grid-cols-7 gap-3 mb-3">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
            <div key={index} className="text-xs text-gray-400 text-center font-medium">{day}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-3 mb-4">
          <div className="rounded-xl overflow-hidden transition-transform hover:scale-105">
            <div className="h-32 bg-gradient-to-t from-green-900 via-green-700 to-green-500 flex items-end justify-center relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white font-bold text-xl">100%</div>
              </div>
              <div className="h-full w-full absolute bg-black/10"></div>
            </div>
          </div>
          <div className="rounded-xl overflow-hidden transition-transform hover:scale-105">
            <div className="h-32 bg-gradient-to-t from-green-900 via-green-700 to-green-500 flex items-end justify-center relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white font-bold text-xl">90%</div>
              </div>
              <div className="h-10 w-full absolute bottom-0 bg-black/10"></div>
            </div>
          </div>
          <div className="rounded-xl overflow-hidden transition-transform hover:scale-105">
            <div className="h-32 bg-gradient-to-t from-green-900 via-green-700 to-green-500 flex items-end justify-center relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white font-bold text-xl">100%</div>
              </div>
              <div className="h-full w-full absolute bg-black/10"></div>
            </div>
          </div>
          <div className="rounded-xl overflow-hidden transition-transform hover:scale-105">
            <div className="h-32 bg-gradient-to-t from-red-900 via-red-700 to-red-500 flex items-end justify-center relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white font-bold text-xl">50%</div>
              </div>
              <div className="h-16 w-full absolute bottom-0 bg-black/10"></div>
            </div>
          </div>
          <div className="rounded-xl overflow-hidden transition-transform hover:scale-105">
            <div className="h-32 bg-gradient-to-t from-green-900 via-green-700 to-green-500 flex items-end justify-center relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white font-bold text-xl">75%</div>
              </div>
              <div className="h-8 w-full absolute bottom-0 bg-black/10"></div>
            </div>
          </div>
          <div className="rounded-xl overflow-hidden transition-transform hover:scale-105">
            <div className="h-32 bg-gradient-to-t from-purple-900 via-purple-700 to-purple-500 flex items-end justify-center relative">
              <div className="absolute inset-0 flex items-center justify-center text-center">
                <div className="text-white font-bold">
                  <div className="text-sm">Today</div>
                  <div className="text-xl mt-1">86%</div>
                </div>
              </div>
              <div className="h-full w-full absolute bg-black/10"></div>
            </div>
          </div>
          <div className="h-32 rounded-xl bg-gray-700/50 flex items-center justify-center">
            <div className="text-gray-400">-</div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Check size={18} className="mr-2 text-green-400" />
            Dose Statistics
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
              <p className="text-gray-300">Total Doses</p>
              <p className="text-xl font-bold">28</p>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-900/20 border border-green-800 rounded-lg">
              <p className="text-gray-300">Taken</p>
              <p className="text-xl font-bold text-green-400">24</p>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-900/20 border border-red-800 rounded-lg">
              <p className="text-gray-300">Missed</p>
              <p className="text-xl font-bold text-red-400">4</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Zap size={18} className="mr-2 text-purple-400" />
            Performance
          </h3>
          <div className="flex items-center justify-center h-40">
            <div className="relative w-36 h-36 rounded-full flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle className="text-gray-700" strokeWidth="10" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                <circle 
                  className="text-purple-500" 
                  strokeWidth="10" 
                  stroke="currentColor" 
                  fill="transparent" 
                  r="40" 
                  cx="50" 
                  cy="50" 
                  strokeDasharray="251.2" 
                  strokeDashoffset="35.2"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute text-center">
                <p className="text-3xl font-bold">86%</p>
                <p className="text-sm text-gray-400">Adherence</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // All Medications List
  const AllMedicationsList = () => (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center">
          <Pill size={20} className="mr-2 text-purple-400" />
          All Medications
        </h2>
        <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium flex items-center transition-colors shadow-lg">
          <PlusCircle size={16} className="mr-1" />
          Add New
        </button>
      </div>
      
      <div className="flex items-center bg-gray-800 rounded-lg p-2 mb-4">
        <Search size={18} className="text-gray-400 ml-2 mr-2" />
        <input
          type="text"
          placeholder="Search medications..."
          className="bg-transparent border-none outline-none text-white w-full"
        />
      </div>
      
      <div className="space-y-4">
        <div className="flex overflow-x-auto pb-2 mb-2">
          <button className="mr-2 px-4 py-2 bg-purple-600 rounded-lg text-white text-sm whitespace-nowrap">
            All Medications
          </button>
          {['Blood Pressure', 'Diabetes', 'Cholesterol', 'Supplements'].map((category, index) => (
            <button key={index} className="mr-2 px-4 py-2 bg-gray-700 rounded-lg text-gray-300 text-sm whitespace-nowrap hover:bg-gray-600">
              {category}
            </button>
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {medications.map(med => {
            const categoryColor = getCategoryColor(med.category);
            return (
              <div 
                key={med.id}
                className="bg-gray-800 rounded-xl p-5 shadow-lg border border-gray-700 hover:border-purple-500 transition-all hover:shadow-xl"
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full ${categoryColor.light} flex items-center justify-center mr-3`}>
                        <span className={`text-lg font-bold ${categoryColor.text}`}>
                          {med.name[0]}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center">
                          <span className="text-lg font-semibold text-white">{med.name}</span>
                          <span className="ml-2 px-2 py-1 text-xs bg-gray-700 rounded-md">{med.dosage}</span>
                        </div>
                        <div className="flex items-center text-gray-400 text-sm mt-1">
                          <span className={`px-2 py-1 rounded-md ${categoryColor.light} ${categoryColor.text} text-xs mr-2`}>
                            {med.category}
                          </span>
                          <Clock size={14} className="mr-1" />
                          <span>Once daily, {med.time}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-gray-700 rounded-full transition-colors">
                    <ChevronRight size={20} className="text-gray-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const Overlay = ({ setSidebarOpen }) => (
    <div
      className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
      onClick={() => setSidebarOpen(false)}
    />
  );


  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-gray-100 overflow-hidden">
      {/* Sidebar Container */}
      <div
        className={`fixed inset-y-0 left-0 z-30 transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:translate-x-0 transition-transform duration-300 ease-in-out md:w-64 flex-shrink-0`}
      >
        <Sidebar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && <Overlay setSidebarOpen={setSidebarOpen} />}

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden md:ml-0">
        {/* Header */}
        <header className="bg-gray-800/80 backdrop-blur-md px-6 py-4 shadow-lg flex justify-between items-center border-b border-gray-700">
          <div className="flex items-center">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 mr-4 md:hidden"
            >
              <Menu size={20} className="text-purple-400" />
            </button>
            <h1 className="text-xl font-bold text-white hidden md:block">Medication Tracking</h1>
            <h1 className="text-xl font-bold text-white md:hidden"><span className="text-purple-400">Med</span>Track</h1>
          </div>
          
          <div className="flex items-center">
            <div className="mr-4 relative hidden md:block">
              <div className="flex items-center bg-gray-700 rounded-full px-3 py-1">
                <Search size={16} className="text-gray-400 mr-2" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  className="bg-transparent border-none text-sm text-white outline-none w-40"
                />
              </div>
            </div>
            <button className="mr-4 relative p-2 rounded-full hover:bg-gray-700">
              <Bell size={20} className="text-gray-300" />
              <span className="absolute -top-1 -right-1 bg-purple-500 rounded-full w-4 h-4 flex items-center justify-center text-xs">3</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center cursor-pointer">
              <span className="text-sm font-bold">AJ</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Dashboard Header */}
          <div className="px-6 py-8 bg-gradient-to-r from-gray-800/30 to-purple-900/10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="mb-4 md:mb-0">
                <h1 className="text-3xl font-bold mb-2">Hello, Alex</h1>
                <div className="flex flex-col md:flex-row md:items-center">
                  <p className="text-gray-300 mb-2 md:mb-0">Today is <span className="font-medium text-white">{formatDate(currentDate)}</span></p>
                  <span className="md:ml-4 md:mt-0 text-sm bg-purple-900/30 px-3 py-1 rounded-full text-purple-300">
                    Adherence: {adherenceRate()}%
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setActiveTab('today')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'today' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Today
                </button>
                <button 
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'all' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  All Medications
                </button>
              </div>
            </div>
          </div>

          {/* Main Dashboard Content */}
          <div className="px-6 py-8">
            {activeTab === 'today' ? (
              <div className="space-y-8">
                {/* Stats Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <StatCard 
                    icon={<Pill size={20} className="text-purple-400" />}
                    title="Daily Medications"
                    value={medications.length}
                    subtext={{ icon: <Check size={14} className="text-green-400" />, text: `${medications.filter(m => m.taken === true).length} taken` }}
                    color="text-green-400"
                    bgColor="bg-purple-500/20"
                  />
                  <StatCard 
                    icon={<Clock size={20} className="text-blue-400" />}
                    title="Next Dose"
                    value={medications.filter(m => m.taken === null)[0]?.time || '--:--'}
                    subtext={{ icon: <Pill size={14} className="text-blue-400" />, text: medications.filter(m => m.taken === null)[0]?.name || 'None' }}
                    color="text-blue-400"
                    bgColor="bg-blue-500/20"
                  />
                  <StatCard 
                    icon={<Zap size={20} className="text-yellow-400" />}
                    title="Adherence Rate"
                    value={`${adherenceRate()}%`}
                    subtext={{ icon: <AlertCircle size={14} className="text-yellow-400" />, text: 'This week' }}
                    color="text-yellow-400"
                    bgColor="bg-yellow-500/20"
                  />
                </div>

                {/* Time Periods */}
                <div className="space-y-6">
                  <TimePeriodSection 
                    period="morning"
                    meds={timeGroups.morning}
                    isCurrentPeriod={currentPeriod === 'morning'}
                    onToggleStatus={toggleMedicationStatus}
                  />
                  <TimePeriodSection 
                    period="afternoon"
                    meds={timeGroups.afternoon}
                    isCurrentPeriod={currentPeriod === 'afternoon'}
                    onToggleStatus={toggleMedicationStatus}
                  />
                  <TimePeriodSection 
                    period="evening"
                    meds={timeGroups.evening}
                    isCurrentPeriod={currentPeriod === 'evening'}
                    onToggleStatus={toggleMedicationStatus}
                  />
                </div>

                {/* Weekly Summary */}
                <WeeklySummary />
              </div>
            ) : (
              <AllMedicationsList />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reminders;