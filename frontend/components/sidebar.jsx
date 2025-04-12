import React from 'react';
import { Home, Calendar, FileText, User, Settings, HelpCircle, LogOut, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Sidebar = ({ isSidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();
  
  const navItems = [
    { icon: <Home size={20} />, label: "Dashboard", path: "/dashboard" },
    { icon: <Calendar size={20} />, label: "Appointments", path: "/appointments" },
    { icon: <FileText size={20} />, label: "Prescription Analyzer", path: "/prescription" },
    { icon: <Calendar size={20} />, label: "Reminders", path: "/reminders" },
    { icon: <User size={20} />, label: "Profile", path: "/profile" },
    { icon: <HelpCircle size={20} />, label: "Help", path: "/help" },
  ];
  
  return (
    <div className={`${isSidebarOpen ? 'w-64' : 'w-16'} bg-slate-900 transition-all duration-300 flex flex-col shadow-2xl border-r border-slate-800 fixed h-full z-10`}>
      <div className="p-4 flex items-center justify-between border-b border-slate-800">
        {isSidebarOpen && <h1 className="text-xl font-bold text-indigo-400 tracking-wide">MedTracker</h1>}
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