import React, { useState } from 'react';
import { motion } from 'framer-motion'; // Import framer-motion for animations
import Lottie from "lottie-react";
import { Award, Shield, Zap, Globe, Heart, Cpu } from 'lucide-react';
import healthAnimation from '../health-animation.json';
import reminderAnimation from '../reminder-animation.json';
import analyticsAnimation from '../analytics.json';
import scanningAnimation from '../scanning.json';
import vaultAnimation from '../vault.json';
import QRAnimation from '../QR.json';
import drugAnimation from '../drug.json';
import insightsAnimation from '../insights.json';
import analysisAnimation from '../analysis.json';

// Logo Component
const Logo = () => (
  <div className="flex items-center space-x-2">
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="40" 
      height="40" 
      viewBox="0 0 100 100" 
      className="fill-current text-cyan-500"
    >
      <path d="M50 10 L80 50 L50 90 L20 50 Z" />
      <text 
        x="50" 
        y="55" 
        textAnchor="middle" 
        fontSize="30" 
        fontWeight="bold" 
        fill="white"
      >
        Rx
      </text>
    </svg>
    <span className="text-2xl font-bold text-white">SmartRx</span>
  </div>
);

// ProcessFlow Component
const ProcessFlow = () => {
  const processSteps = [
    { 
      step: 1, 
      title: "Digital Prescription Capture", 
      description: "AI-powered prescription scanning & text extraction",
      animation: scanningAnimation,
      color: "blue"
    },
    { 
      step: 2, 
      title: "Intelligent Analysis", 
      description: "AI-based analysis for dosage, interactions & warnings",
      animation: analysisAnimation,
      color: "blue"
    },
    { 
      step: 3, 
      title: "Personalized Tracking", 
      description: "Real-time medication reminders & health reports",
      animation: insightsAnimation,
      color: "blue"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-16 relative z-10 translate-x-16">
      <h2 className="text-3xl font-bold text-center text-gray-200 mb-30 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600 -translate-x-16">
        Streamlined Digital Health Workflow
      </h2>
      <div className="relative w-full max-w-5xl mx-auto">
        {/* Curved connecting line */}
        <div className="absolute top-1/2 left-0 right-0 transform -translate-y-1/2 z-0">
          <svg width="100%" height="120" className="overflow-visible">
            <style>
              {`
                @keyframes dash {
                  from {
                    stroke-dashoffset: 0;
                  }
                  to {
                    stroke-dashoffset: -100;
                  }
                }
              `}
            </style>
            <path 
              d="M-100 60 C250 20, 550 100, 1050 60" // Curved Bezier path
              fill="none" 
              stroke="rgba(79, 209, 197, 0.3)" 
              strokeWidth="6" 
              strokeDasharray="15 15"
              style={{
                animation: 'dash 5s linear infinite'
              }}
            />
          </svg>
        </div>
        
        <div className="relative flex justify-between items-start z-10 -translate-x-16">
          {processSteps.map((item) => (
            <div 
              key={item.step} 
              className="flex flex-col items-center w-1/3 relative group"
            >
              <div 
                className={`w-32 h-32 rounded-full bg-gray-800 border-4 border-${item.color}-500 flex items-center justify-center relative z-20 shadow-2xl transform transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-4`}
              >
                <div className={`w-20 h-20 rounded-full bg-${item.color}-900/50 flex items-center justify-center`}>
                  <Lottie 
                    animationData={item.animation}
                    loop={true}
                    style={{ height: 100, width: 100 }}
                    className="drop-shadow-md"
                  />
                </div>
                {/* Number circle for all steps */}
                <div 
                  className={`absolute -top-10 w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shadow-md z-30 transform transition-all duration-300 group-hover:scale-110`}
                >
                  {item.step}
                </div>
              </div>
              <div className="text-center mt-6 px-4">
                <h1 className="text-xl font-semibold mb-2 text-gray-200">{item.title}</h1>
                <p className="text-lg text-gray-400">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// HeroSection Component
const HeroSection = () => {
  const [hoveredStat, setHoveredStat] = useState(null);
  const heroStats = [
    { 
      icon: Award, 
      value: "Comprehensive", 
      label: "Digital Health Management",
      description: "Centralized system for holistic health tracking"
    },
    { 
      icon: Shield, 
      value: "Secure", 
      label: "Health Records",
      description: "Encrypted digital repository of prescriptions"
    },
    { 
      icon: Zap, 
      value: "Intelligent", 
      label: "Medication Tracking",
      description: "Smart reminders and adherence monitoring"
    }
  ];


  return (
    <div className="container mx-auto px-4 py-12 md:py-16 flex flex-col md:flex-row items-center relative z-10">
      {/* Left Content */}
      <motion.div 
        className="md:w-1/2 mb-6 md:mb-0 pr-0 md:pr-8 space-y-6"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
       <div className="bg-gray-800/50 backdrop-blur-md p-4 mb-16 mt-[-40px] rounded-xl border border-cyan-500/20 shadow-lg">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
              SmartR<span className="text-2xl align-sub">x</span>
            </span>
            <span className="block text-2xl md:text-3xl text-gray-300 mt-2">
            Digital Health Management System
            </span>
          </h1>
          <motion.p 
            className="text-base text-gray-400 mb-6 max-w-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            Revolutionize healthcare management with an integrated digital platform. Seamlessly track prescriptions, manage medications, and access critical health information.
          </motion.p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <motion.button 
            className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-full text-base font-semibold hover:from-cyan-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-2xl hover:shadow-cyan-500/50 relative overflow-hidden flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Cpu className="w-5 h-5" />
            <span> Health Profile</span>
          </motion.button>
          <motion.button 
            className="border border-cyan-400 text-cyan-400 px-6 py-3 rounded-full text-base font-semibold hover:bg-cyan-900/30 transition-all transform hover:scale-105 shadow-md relative overflow-hidden flex items-center space-x-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Globe className="w-5 h-5" />
            <span>Explore Features</span>
          </motion.button>
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          {heroStats.map((stat, index) => (
            <motion.div 
              key={index}
              className={`bg-gray-800/60 p-4 rounded-xl border transition-all duration-300 ${
                hoveredStat === index 
                  ? 'border-cyan-500 shadow-lg scale-105' 
                  : 'border-gray-700 opacity-80'
              }`}
              onMouseEnter={() => setHoveredStat(index)}
              onMouseLeave={() => setHoveredStat(null)}
              whileHover={{ scale: 1.05 }}
            >
              <div className="flex items-center space-x-2 mb-2">
                <stat.icon 
                  className={`w-6 h-6 ${
                    hoveredStat === index ? 'text-cyan-400' : 'text-gray-400'
                  }`} 
                />
                <span className="text-lg font-bold text-white">{stat.value}</span>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-300">{stat.label}</h4>
                {hoveredStat === index && (
                  <motion.p 
                    className="text-xs text-gray-500 mt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {stat.description}
                  </motion.p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Right Content - Animated Illustration */}
      <motion.div 
        className="md:w-1/2 flex justify-center relative"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.div
          className="relative"
          animate={{
            y: [0, -20, 0],
            scale: [1, 1.02, 1]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Lottie 
            animationData={healthAnimation}
            loop={true}
            className="max-w-full drop-shadow-2xl z-10 relative"
            style={{ height: 500, width: 500 }}
          />
          
          {/* Decorative Pulse Rings */}
          <motion.div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full"
            animate={{
              scale: [1, 1.5],
              opacity: [0.6, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut"
            }}
          >
            <div className="absolute inset-0 bg-cyan-500/20 rounded-full animate-ping"></div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

// Landing Component
const Landing = () => {
  const [activeFeature, setActiveFeature] = useState(null);

  const features = [
    {
      title: "Emergency QR Code",
      description: "Instant access to critical emergency information",
      animation: QRAnimation,
      color: "teal",
      gradient: "from-teal-500 to-cyan-600"
    },
    {
      title: "Dashboard & Reports",
      description: "Comprehensive usage tracking, cost analysis, and trend reporting",
      animation: analyticsAnimation,
      color: "amber",
      gradient: "from-amber-500 to-orange-600"
    },
    {
      title: "AI-Powered Prescription",
      description: "Advanced prescription summarization and complexity reduction",
      animation: scanningAnimation,
      color: "cyan",
      gradient: "from-cyan-500 to-blue-600"
    },
    {
      title: "Drug Interaction Alerts",
      description: "Risk identification and proactive user notifications",
      animation: drugAnimation,
      color: "rose",
      gradient: "from-rose-500 to-red-600"
    },
    {
        title: "Smart Medication Tracking",
        description: "Enhanced personalized reminders and precision management.",
        animation: reminderAnimation,
        color: "emerald",
        gradient: "from-emerald-500 to-green-600"
      },
    {
      title: "Digital Health Records",
      description: "Centralized repository for prescription management",
      animation: vaultAnimation,
      color: "indigo",
      gradient: "from-indigo-500 to-purple-600"
    }
  ];

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black text-white overflow-hidden relative">
      {/* Animated Background Grid */}
      <motion.div 
        className="absolute inset-0 pointer-events-none opacity-10 overflow-hidden"
        initial={{ opacity: 0.05 }}
        animate={{ 
          opacity: [0.05, 0.1, 0.05],
          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%']
        }}
        transition={{ 
          duration: 10, 
          repeat: Infinity, 
          ease: "linear" 
        }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
      </motion.div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 mix-blend-overlay"></div>

      {/* Header with Logo */}
      <header className="container mx-auto px-4 py-6 relative z-10">
        <Logo />
      </header>

      {/* Hero Section */}
      <HeroSection />

      {/* Floating Decorative Elements */}
      <motion.div 
        className="absolute top-1/4 left-1/4 w-32 h-32 bg-cyan-500/20 rounded-full filter blur-2xl"
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 20, 0],
          y: [0, -20, 0]
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div 
        className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-blue-500/20 rounded-full filter blur-2xl"
        animate={{
          scale: [1, 1.1, 1],
          x: [0, -20, 0],
          y: [0, 20, 0]
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Features Section */}
      <div className="container mx-auto px-4 py-12 relative z-10">
  <h2 className="text-4xl font-bold text-center text-gray-200 mb-15 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
    Health Management Features
  </h2>
  <div className="grid md:grid-cols-3 gap-6">
    {features.map((feature, index) => (
      <div 
        key={index} 
        className={`bg-gray-800/60 backdrop-blur-lg p-5 rounded-2xl shadow-2xl border border-gray-700/50 hover:border-${feature.color}-500 transition-all duration-300 transform hover:scale-105 group relative overflow-hidden`}
        onMouseEnter={() => setActiveFeature(index)}
        onMouseLeave={() => setActiveFeature(null)}
      >
        <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-300 z-[-1]`}></div>
        <div className="mb-4 flex items-center justify-center">
          <Lottie 
            animationData={feature.animation}
            loop={true}
            style={{ height: 150, width: 150 }}
            className="drop-shadow-md"
          />
        </div>
        <div className="text-center">
          <h2 className={`text-xl font-semibold mb-2 text-${feature.color}-400`}>
            {feature.title}
          </h2>
          <p className="text-lg text-gray-400">
            {feature.description}
          </p>
        </div>
      </div>
    ))}
  </div>
</div>

      {/* Process Flow Section */}
      <ProcessFlow />
    </div>
  );
};

export default Landing;