import React, { useState, useEffect } from 'react';
import { Home, Calendar, FileText, User, HelpCircle, LogOut, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Sidebar = ({ isSidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  
  const navItems = [
    { icon: <Home size={20} />, label: "Dashboard", path: "/dashboard" },
    { icon: <Calendar size={20} />, label: "Appointments", path: "/appointments" },
    { icon: <FileText size={20} />, label: "Prescription Analyzer", path: "/prescription" },
    { icon: <Calendar size={20} />, label: "Reminders", path: "/reminders" },
    { icon: <User size={20} />, label: "Profile", path: "/profile" },
    { icon: <HelpCircle size={20} />, label: "Help", path: "/help" },
  ];

  // Logo component with SVG and advanced styling
  const Logo = () => (
    <div 
      className="relative py-2 px-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative flex items-center">
        {/* Decorative pill shape in background */}
        <div className="absolute -left-2 -top-1 w-full h-10 bg-indigo-900/30 rounded-full blur-sm"></div>
        
        {/* Main logo text with 3D effect */}
        <div className="relative">
          <span className="text-2xl font-black tracking-tight text-white drop-shadow-lg">
            Smart
          </span>
          <span className="relative text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">
            R
            <span className="absolute -bottom-1 -right-2 text-xs font-bold text-cyan-300 italic">x</span>
          </span>
          
          {/* Decorative elements */}
          <div className={`absolute -top-1 -left-1 w-2 h-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-500/50 transition-all duration-500 ${isHovered ? 'animate-ping' : ''}`}></div>
          <div className="absolute -bottom-1 right-3 w-1 h-1 rounded-full bg-purple-400 shadow-lg shadow-purple-500/50"></div>
        </div>
        
        {/* Medical cross symbol */}
        <div className="absolute -right-6 top-0 opacity-60">
          <div className="relative w-6 h-6">
            <div className="absolute top-2 left-0 w-6 h-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"></div>
            <div className="absolute top-0 left-2 w-2 h-6 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full"></div>
          </div>
        </div>
      </div>
      
      {/* Animated underline */}
      <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-600 rounded-full transition-all duration-700 ${isHovered ? 'w-full' : 'w-1/2'}`}></div>
      
      {/* Tagline with subtle appearance */}
      {isHovered && (
        <div className="absolute -bottom-4 left-0 w-full text-center">
          <span className="text-xs text-slate-400 italic">Intelligent Prescriptions</span>
        </div>
      )}
    </div>
  );
  
  return (
    <div className={`${isSidebarOpen ? 'w-64' : 'w-16'} bg-slate-900 transition-all duration-300 flex flex-col shadow-2xl border-r border-slate-800 fixed h-full z-10`}>
      <div className="p-4 flex items-center justify-between border-b border-slate-800">
        {isSidebarOpen && <Logo />}
        
        <button
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg bg-slate-800 text-indigo-400 hover:bg-slate-700 transition-colors"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      <nav className="flex-1 py-6">
        <ul className="space-y-2 px-2">
          {navItems.map((item, index) => (
            <li key={index}>
              <button
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center p-3 rounded-lg transition-all hover:bg-slate-800 text-left ${window.location.pathname === item.path ? 'bg-indigo-900/60 text-indigo-400 shadow-lg' : 'text-slate-300'}`}
              >
                <span className={isSidebarOpen ? "mr-3" : "mx-auto"}>{item.icon}</span>
                {isSidebarOpen && <span className="font-medium">{item.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-2 border-t border-slate-800">
        <button onClick={() => navigate('/logout')} className="w-full flex items-center p-3 rounded-lg text-red-400 hover:bg-slate-800 transition-colors text-left">
          <span className={isSidebarOpen ? "mr-3" : "mx-auto"}><LogOut size={20} /></span>
          {isSidebarOpen && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;