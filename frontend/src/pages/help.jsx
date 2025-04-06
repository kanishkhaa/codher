import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Lottie from "lottie-react";
import { 
  ChevronDown, 
  ChevronUp, 
  Book, 
  HelpCircle, 
  Info, 
  Search, 
  Award, 
  Shield, 
  Zap, 
  Globe, 
  Heart, 
  Cpu,
  AlertCircle,
  Bell,
  Clock,
  FileText,
  QrCode,
  BarChart,
  Camera,
  Pill,
  Calendar,
  Database
} from 'lucide-react';
import Sidebar from '../../components/sidebar'; // Added Sidebar import

// Animation imports
import healthAnimation from '../lotifi/health-animation.json';
import reminderAnimation from '../lotifi/reminder-animation.json';
import analyticsAnimation from '../lotifi/analytics.json';
import scanningAnimation from '../lotifi/scanning.json';
import vaultAnimation from '../lotifi/vault.json';
import QRAnimation from '../lotifi/QR.json';
import drugAnimation from '../lotifi/drug.json';

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

// Accordion Item Component
const AccordionItem = ({ title, children, icon: Icon, isOpen, onClick, color = "cyan" }) => {
  return (
    <div className="mb-4">
      <button
        className={`w-full flex items-center justify-between p-4 rounded-lg bg-gray-800/60 border border-gray-700/50 hover:border-${color}-500 text-left transition-all duration-300`}
        onClick={onClick}
      >
        <div className="flex items-center">
          <Icon className={`mr-3 text-${color}-400 w-6 h-6`} />
          <span className="text-lg font-medium text-white">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="text-gray-400" /> : <ChevronDown className="text-gray-400" />}
      </button>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-gray-800/30 backdrop-blur-sm border border-t-0 border-gray-700/50 rounded-b-lg p-4 text-gray-300"
        >
          {children}
        </motion.div>
      )}
    </div>
  );
};

// Feature Card Component
const FeatureCard = ({ title, description, icon: Icon, animation, color = "cyan" }) => {
  return (
    <div className={`bg-gray-800/60 backdrop-blur-lg p-5 rounded-2xl shadow-lg border border-gray-700/50 hover:border-${color}-500 transition-all duration-300 transform hover:scale-105 group relative overflow-hidden`}>
      <div className={`absolute inset-0 bg-gradient-to-r from-${color}-500 to-${color}-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300 z-[-1]`}></div>
      <div className="mb-4 flex items-center justify-center">
        {animation ? (
          <Lottie 
            animationData={animation}
            loop={true}
            style={{ height: 100, width: 100 }}
            className="drop-shadow-md"
          />
        ) : (
          <div className={`p-3 rounded-full bg-${color}-900/50 flex items-center justify-center mb-4`}>
            <Icon className={`w-8 h-8 text-${color}-400`} />
          </div>
        )}
      </div>
      <div className="text-center">
        <h3 className={`text-xl font-semibold mb-2 text-${color}-400`}>
          {title}
        </h3>
        <p className="text-gray-400">
          {description}
        </p>
      </div>
    </div>
  );
};

// Help Page Component
const Help = () => {
  const navigate = useNavigate();
  const [activeAccordion, setActiveAccordion] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setSidebarOpen] = useState(true); // Added sidebar state

  const toggleAccordion = (index) => {
    setActiveAccordion(activeAccordion === index ? null : index);
  };

  // FAQ Data (unchanged)
  const faqs = [
    {
      title: "How do I create a health profile?",
      icon: FileText,
      content: (
        <div className="space-y-4">
          <p>Creating your health profile is the first step to unlocking the full potential of SmartRx:</p>
          <ol className="list-decimal list-inside space-y-2 pl-4">
            <li>Click the "Health Profile" button on the homepage</li>
            <li>Fill in your personal information (name, date of birth, contact details)</li>
            <li>Add your medical conditions and allergies</li>
            <li>Input current medications and dosage information</li>
            <li>Add emergency contact information</li>
            <li>Review and submit your profile</li>
          </ol>
          <p>Your profile information is securely stored and encrypted. You can update it anytime by accessing your profile settings.</p>
        </div>
      )
    },
    {
      title: "How does the prescription scanner work?",
      icon: Camera,
      content: (
        <div className="space-y-4">
          <p>Our AI-powered prescription scanner turns paper prescriptions into digital data:</p>
          <ol className="list-decimal list-inside space-y-2 pl-4">
            <li>From your dashboard, tap the "Scan Prescription" button</li>
            <li>Allow camera access when prompted</li>
            <li>Position your prescription within the scanning frame</li>
            <li>Hold steady while the AI processes the image</li>
            <li>Review the extracted information for accuracy</li>
            <li>Make any necessary corrections</li>
            <li>Confirm to save to your digital health records</li>
          </ol>
          <p>The system extracts medication names, dosages, frequency, prescriber information, and other critical details. Our advanced OCR technology works with most handwritten and printed prescriptions.</p>
        </div>
      )
    },
    {
      title: "How do I set up medication reminders?",
      icon: Bell,
      content: (
        <div className="space-y-4">
          <p>Setting up medication reminders helps ensure you never miss a dose:</p>
          <ol className="list-decimal list-inside space-y-2 pl-4">
            <li>Navigate to the "Medications" section from your dashboard</li>
            <li>Select the medication you want to set reminders for</li>
            <li>Click "Set Reminder" button</li>
            <li>Choose frequency (daily, twice daily, etc.)</li>
            <li>Set specific times for each reminder</li>
            <li>Select reminder type (notification, email, or both)</li>
            <li>Enable "Confirm Taken" feature for adherence tracking</li>
            <li>Save your settings</li>
          </ol>
          <p>You can customize reminder tones, snooze options, and caregiver notifications from the settings menu.</p>
        </div>
      )
    },
    {
      title: "How do I generate my emergency QR code?",
      icon: QrCode,
      content: (
        <div className="space-y-4">
          <p>Your emergency QR code provides first responders with critical health information:</p>
          <ol className="list-decimal list-inside space-y-2 pl-4">
            <li>Go to "Emergency Information" in your profile</li>
            <li>Select which information to include (allergies, conditions, medications, emergency contacts)</li>
            <li>Click "Generate Emergency QR Code"</li>
            <li>Preview the information that will be visible</li>
            <li>Confirm and generate your code</li>
          </ol>
          <p>You can download your QR code as an image, print it, or order a waterproof QR code card or bracelet through our partners. When scanned, the QR code displays only the critical information you've selected, even without internet access.</p>
        </div>
      )
    },
    {
      title: "How does drug interaction detection work?",
      icon: AlertCircle,
      content: (
        <div className="space-y-4">
          <p>Our drug interaction system protects you from potentially harmful medication combinations:</p>
          <ol className="list-decimal list-inside space-y-2 pl-4">
            <li>Each time you add a new medication to your profile</li>
            <li>The system automatically cross-references with your existing medications</li>
            <li>Checks against our comprehensive drug interaction database</li>
            <li>Analyzes potential interactions with your medical conditions</li>
            <li>Considers food interactions and timing conflicts</li>
          </ol>
          <p>If any potential interactions are detected, you'll receive immediate alerts classified by severity (mild, moderate, severe). The system provides detailed information about each interaction and suggests questions to ask your healthcare provider.</p>
          <p>Our database is updated monthly with the latest pharmaceutical research and FDA warnings.</p>
        </div>
      )
    },
    {
      title: "How do I access my medication reports and analytics?",
      icon: BarChart,
      content: (
        <div className="space-y-4">
          <p>Track your medication adherence and health trends with detailed reports:</p>
          <ol className="list-decimal list-inside space-y-2 pl-4">
            <li>Navigate to the "Reports" section from your dashboard</li>
            <li>Select the report type (adherence, side effects, cost analysis, trends)</li>
            <li>Choose the time period you wish to analyze</li>
            <li>Select which medications to include</li>
            <li>Generate your personalized report</li>
          </ol>
          <p>You can view reports directly in the app, export them as PDFs, or share them securely with your healthcare providers. The analytics dashboard provides visual representations of your medication patterns and highlights areas for improvement.</p>
        </div>
      )
    },
    {
      title: "How secure is my health data?",
      icon: Shield,
      content: (
        <div className="space-y-4">
          <p>SmartRx implements industry-leading security measures to protect your sensitive health information:</p>
          <ul className="list-disc list-inside space-y-2 pl-4">
            <li>End-to-end encryption for all data transmission</li>
            <li>AES-256 encryption for stored data</li>
            <li>HIPAA-compliant data handling practices</li>
            <li>Multi-factor authentication options</li>
            <li>Biometric login support (fingerprint, face recognition)</li>
            <li>Automatic session timeouts</li>
            <li>Detailed access logs</li>
          </ul>
          <p>You maintain complete control over who can access your information and what data is shared. Our privacy-first approach means we never sell your data to third parties or use it for advertising.</p>
        </div>
      )
    },
    {
      title: "How do I share data with my healthcare providers?",
      icon: Share,
      content: (
        <div className="space-y-4">
          <p>Securely share your health information with authorized healthcare providers:</p>
          <ol className="list-decimal list-inside space-y-2 pl-4">
            <li>Go to the "Share" section in your dashboard</li>
            <li>Select "Add Healthcare Provider"</li>
            <li>Enter your provider's email or search our provider directory</li>
            <li>Choose what information to share (all records or specific items)</li>
            <li>Set a sharing duration (one-time, limited period, or ongoing)</li>
            <li>Send the secure invitation</li>
          </ol>
          <p>Your healthcare provider will receive a secure link to create an account or log in to their existing account. You'll be notified when they access your information, and you can revoke access at any time.</p>
          <p>For providers using compatible EHR systems, we offer direct integration for seamless data exchange.</p>
        </div>
      )
    },
  ];

  // Filter FAQs based on search query
  const filteredFaqs = faqs.filter(faq => 
    faq.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    faq.content.props.children.some(child => 
      typeof child === 'object' && child.props && child.props.children &&
      child.props.children.some(item => 
        typeof item === 'string' && item.toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
  );

  // Feature sections data
  const featureSections = [
    {
      title: "Core Features",
      description: "Essential functions that form the foundation of the SmartRx platform",
      features: [
        {
          title: "Digital Prescription Scanner",
          description: "Transform paper prescriptions into digital format with our AI-powered scanner that extracts and organizes medication details.",
          icon: Camera,
          animation: scanningAnimation,
          color: "cyan"
        },
        {
          title: "Medication Tracking",
          description: "Manage your medications with smart reminders, refill alerts, and adherence monitoring to stay on track with your treatment plan.",
          icon: Calendar,
          animation: reminderAnimation,
          color: "emerald"
        },
        {
          title: "Health Record Vault",
          description: "Store your prescription history, medication details, and health documents in one secure, encrypted digital repository.",
          icon: Database,
          animation: vaultAnimation,
          color: "indigo"
        }
      ]
    },
    {
      title: "Safety & Analysis",
      description: "Advanced features to protect your health and provide personalized insights",
      features: [
        {
          title: "Drug Interaction Detection",
          description: "Automatically identify potentially harmful interactions between medications, supplements, and conditions.",
          icon: AlertCircle,
          animation: drugAnimation,
          color: "rose"
        },
        {
          title: "Health Analytics",
          description: "Visualize medication adherence, side effects, and health trends through comprehensive reports and dashboards.",
          icon: BarChart,
          animation: analyticsAnimation,
          color: "amber"
        },
        {
          title: "Emergency QR Access",
          description: "Generate a secure QR code for emergency responders to access critical health information when needed most.",
          icon: QrCode,
          animation: QRAnimation,
          color: "teal"
        }
      ]
    }
  ];

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black text-white min-h-screen flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-10 transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      </div>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'} overflow-hidden relative`}>
        {/* Background elements */}
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

        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 mix-blend-overlay"></div>

        {/* Header */}
        <header className="container mx-auto px-4 py-6 relative z-10 flex justify-between items-center">
          <Logo />
          <button 
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 bg-gray-800/60 px-4 py-2 rounded-full border border-cyan-500/30 hover:border-cyan-500 transition-all"
          >
            <Globe className="w-5 h-5 text-cyan-400" />
            <span className="text-gray-300">Back to Home</span>
          </button>
        </header>

        {/* Hero section */}
        <div className="container mx-auto px-4 py-12 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <motion.h1 
              className="text-4xl md:text-5xl font-bold mb-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
                SmartRx Help Center
              </span>
            </motion.h1>
            <motion.p 
              className="text-xl text-gray-300 mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Comprehensive guide to using the SmartRx Digital Health Management System
            </motion.p>
            
            {/* Search bar */}
            <motion.div 
              className="relative max-w-xl mx-auto mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search for help topics..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-800/60 backdrop-blur-md border border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="bg-gray-800/40 backdrop-blur-md rounded-2xl border border-gray-700/50 p-6 mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <Book className="mr-3 text-cyan-400" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
                Getting Started with SmartRx
              </span>
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-200">Welcome to Your Digital Health Platform</h3>
                <p className="text-gray-300">
                  SmartRx transforms how you manage your medications and health information. Our platform helps you:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <Cpu className="mt-1 mr-2 text-cyan-400 w-5 h-5 flex-shrink-0" />
                    <span>Digitize and organize all your prescriptions in one secure place</span>
                  </li>
                  <li className="flex items-start">
                    <Bell className="mt-1 mr-2 text-cyan-400 w-5 h-5 flex-shrink-0" />
                    <span>Set up smart medication reminders tailored to your schedule</span>
                  </li>
                  <li className="flex items-start">
                    <AlertCircle className="mt-1 mr-2 text-cyan-400 w-5 h-5 flex-shrink-0" />
                    <span>Detect potentially harmful drug interactions automatically</span>
                  </li>
                  <li className="flex items-start">
                    <QrCode className="mt-1 mr-2 text-cyan-400 w-5 h-5 flex-shrink-0" />
                    <span>Create emergency access to critical health information</span>
                  </li>
                  <li className="flex items-start">
                    <BarChart className="mt-1 mr-2 text-cyan-400 w-5 h-5 flex-shrink-0" />
                    <span>Track your medication adherence and health trends</span>
                  </li>
                </ul>
                
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-200">First Steps:</h4>
                  <ol className="list-decimal list-inside pl-4 space-y-2 mt-2">
                    <li>Create your health profile with personal and medical information</li>
                    <li>Scan your first prescription using our AI-powered tool</li>
                    <li>Set up reminders for your medications</li>
                    <li>Generate your emergency QR code for critical information</li>
                    <li>Explore the dashboard to access all features</li>
                  </ol>
                </div>
              </div>
              
              <div className="flex items-center justify-center">
                <Lottie 
                  animationData={healthAnimation}
                  loop={true}
                  style={{ height: 300, width: 300 }}
                  className="drop-shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Feature Sections */}
        {featureSections.map((section, sectionIndex) => (
          <div key={`section-${sectionIndex}`} className="container mx-auto px-4 py-8 relative z-10">
            <h2 className="text-2xl font-bold mb-3 text-gray-200">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
                {section.title}
              </span>
            </h2>
            <p className="text-gray-400 mb-6">{section.description}</p>
            
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {section.features.map((feature, featureIndex) => (
                <FeatureCard 
                  key={`feature-${sectionIndex}-${featureIndex}`}
                  title={feature.title}
                  description={feature.description}
                  icon={feature.icon}
                  animation={feature.animation}
                  color={feature.color}
                />
              ))}
            </div>
          </div>
        ))}

        {/* FAQ Section */}
        <div className="container mx-auto px-4 py-8 relative z-10 mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <HelpCircle className="mr-3 text-cyan-400" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
              Frequently Asked Questions
            </span>
          </h2>
          
          {searchQuery && filteredFaqs.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-400">No results found for "{searchQuery}"</p>
            </div>
          ) : (
            filteredFaqs.map((faq, index) => (
              <AccordionItem
                key={`faq-${index}`}
                title={faq.title}
                icon={faq.icon}
                isOpen={activeAccordion === index}
                onClick={() => toggleAccordion(index)}
              >
                {faq.content}
              </AccordionItem>
            ))
          )}
        </div>

        {/* Support Section */}
        <div className="container mx-auto px-4 py-8 relative z-10 mb-12">
          <div className="bg-gradient-to-r from-cyan-900/40 to-blue-900/40 rounded-2xl border border-cyan-500/30 p-6">
            <h2 className="text-2xl font-bold mb-4 text-center text-gray-200">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-600">
                Need Additional Help?
              </span>
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6 mt-6">
              <div className="bg-gray-800/60 p-4 rounded-xl text-center">
                <Heart className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">Customer Support</h3>
                <p className="text-gray-400 mb-3">Get assistance from our dedicated support team</p>
                <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-full text-sm transition-colors">
                  Contact Support
                </button>
              </div>
              
              <div className="bg-gray-800/60 p-4 rounded-xl text-center">
                <Globe className="w-10 h-10 text-blue-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">Video Tutorials</h3>
                <p className="text-gray-400 mb-3">Watch step-by-step guides for all features</p>
                <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full text-sm transition-colors">
                  View Tutorials
                </button>
              </div>
              
              <div className="bg-gray-800/60 p-4 rounded-xl text-center">
                <Info className="w-10 h-10 text-teal-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">Knowledge Base</h3>
                <p className="text-gray-400 mb-3">Browse our comprehensive documentation</p>
                <button className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-full text-sm transition-colors">
                  Explore Articles
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-8 relative z-10 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <Logo />
            <div className="mt-4 md:mt-0">
              <p className="text-gray-400 text-sm">
                © 2025 SmartRx Health Systems. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

// Share Icon Component
const Share = (props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
};

export default Help;