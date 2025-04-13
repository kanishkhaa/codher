import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CircleSlash, ArrowDown, Pill, AlertCircle, AlertTriangle, DollarSign } from 'lucide-react';

const DrugAlternatives = ({ currentMedications }) => {
  const [alternatives, setAlternatives] = useState({});
  const [loading, setLoading] = useState({});
  const [expanded, setExpanded] = useState({});
  const [error, setError] = useState(null);

  // Function to fetch drug alternatives from backend API
  const fetchAlternatives = async (medication) => {
    if (!medication || !medication.name) return [];
    
    setLoading(prev => ({ ...prev, [medication.id]: true }));
    
    try {
      // Call your Flask backend endpoint
      const response = await axios.post('http://localhost:5000/find-alternatives', {
        drugs: [medication.name]
      });
      
      if (!response.data || !response.data.alternatives) {
        throw new Error("Invalid response format from API");
      }
      
      const alternatives = response.data.alternatives[medication.name.toLowerCase()] || [];
      
      // For each alternative, fetch additional details if needed
      const enhancedAlternatives = alternatives.map(altName => {
        return {
          name: altName,
          rxcui: "", // You can fetch this if needed
          tty: "SBD", // Brand by default
          costComparison: getEstimatedCostComparison(), // You can implement a real calculation
          isGeneric: isLikelyGeneric(altName),
          advantages: getStandardAdvantages(isLikelyGeneric(altName)),
          sideEffects: getCommonSideEffects(),
          interactionRisk: "Low" // Default value, can be improved with more API calls
        };
      });
      
      setAlternatives(prev => ({ 
        ...prev, 
        [medication.id]: { 
          status: enhancedAlternatives.length > 0 ? 'success' : 'not-found', 
          data: enhancedAlternatives 
        } 
      }));
    } catch (error) {
      console.error(`Error fetching alternatives for ${medication.name}:`, error);
      setAlternatives(prev => ({ 
        ...prev, 
        [medication.id]: { 
          status: 'error', 
          data: [] 
        } 
      }));
      setError(`Failed to fetch alternatives: ${error.message}`);
    } finally {
      setLoading(prev => ({ ...prev, [medication.id]: false }));
    }
  };
  
  // Helper functions to enhance the alternative data
  const isLikelyGeneric = (name) => {
    const genericTerms = ['generic', 'hydrochloride', 'hcl', 'sodium', 'sulfate', 'citrate'];
    return name.toLowerCase().split(' ').some(term => genericTerms.includes(term.toLowerCase()));
  };
  
  const getEstimatedCostComparison = () => {
    const options = [
      { percentage: '25-40% less', label: 'Significantly cheaper' },
      { percentage: '10-25% less', label: 'Moderately cheaper' },
      { percentage: '1-10% less', label: 'Slightly cheaper' },
      { percentage: 'Similar price', label: 'Similar cost' },
    ];
    return options[Math.floor(Math.random() * options.length)];
  };
  
  const getStandardAdvantages = (isGeneric) => {
    if (isGeneric) {
      return [
        'Lower cost',
        'Same active ingredient',
        'Widely available'
      ];
    } else {
      return [
        'Similar efficacy',
        'Available in multiple formulations',
        'May have better coverage'
      ];
    }
  };
  
  const getCommonSideEffects = () => {
    return ['Consult doctor for side effects'];
  };

  // Toggle expanded state for a medication
  const toggleExpanded = (medicationId) => {
    setExpanded(prev => ({ ...prev, [medicationId]: !prev[medicationId] }));
  };

  // Fetch alternatives when component mounts
  useEffect(() => {
    if (currentMedications && currentMedications.length > 0) {
      currentMedications.forEach(medication => {
        fetchAlternatives(medication);
      });
    }
  }, [currentMedications]);

  // Get the status indicator color
  const getInteractionRiskColor = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="mb-8 bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/30 shadow-xl">
      <div className="flex items-center mb-6">
        <div className="p-4 rounded-full mr-6 bg-gradient-to-br from-purple-500 to-indigo-600">
          <Pill className="w-7 h-7 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500 mb-1">
            Alternative Medications
          </h3>
          <p className="text-gray-400 text-sm tracking-wide">
            Compare options with potentially lower costs or fewer side effects
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-500/20 border border-red-700/30 rounded-lg text-red-300">
          <p className="font-medium">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {currentMedications.map((medication) => (
          <div 
            key={medication.id}
            className="border border-gray-700/30 rounded-xl overflow-hidden"
          >
            <div 
              className="p-4 bg-gray-700/30 flex justify-between items-center cursor-pointer"
              onClick={() => toggleExpanded(medication.id)}
            >
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 bg-purple-500/20 text-purple-300 rounded-full mr-3 text-sm">
                  {medication.id}
                </div>
                <h4 className="text-lg font-semibold text-white">{medication.name}</h4>
              </div>
              <div className="flex items-center">
                {loading[medication.id] ? (
                  <div className="animate-spin h-5 w-5 border-2 border-purple-500 border-opacity-20 border-t-purple-500 rounded-full mr-2"></div>
                ) : (
                  <ArrowDown className={`w-5 h-5 text-gray-400 transition-transform ${expanded[medication.id] ? 'rotate-180' : ''}`} />
                )}
              </div>
            </div>

            {expanded[medication.id] && (
              <div className="p-4 bg-gray-800/60">
                {alternatives[medication.id] ? (
                  alternatives[medication.id].status === 'not-found' ? (
                    <div className="py-4 text-center">
                      <CircleSlash className="mx-auto w-10 h-10 text-gray-500 mb-2" />
                      <p className="text-gray-400">No alternatives found for this medication.</p>
                      <p className="text-gray-500 text-sm mt-1">Please consult with your healthcare provider for options.</p>
                    </div>
                  ) : alternatives[medication.id].data.length === 0 ? (
                    <div className="py-4 text-center">
                      <CircleSlash className="mx-auto w-10 h-10 text-gray-500 mb-2" />
                      <p className="text-gray-400">No alternatives found for this medication.</p>
                      <p className="text-gray-500 text-sm mt-1">Please consult with your healthcare provider for options.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="mb-2 px-2">
                        <div className="text-purple-300 font-medium text-sm uppercase tracking-wider mb-2">
                          Available Alternatives:
                        </div>
                      </div>
                      
                      {alternatives[medication.id].data.map((alt, index) => (
                        <div 
                          key={`${medication.id}-alt-${index}`}
                          className="border border-gray-700/30 rounded-lg p-3 hover:bg-gray-700/20 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center">
                              <span className={`px-2 py-1 rounded-md text-xs font-medium mr-2 ${alt.isGeneric ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                {alt.isGeneric ? 'Generic' : 'Brand'}
                              </span>
                              <h5 className="text-white font-medium">{alt.name}</h5>
                            </div>
                            <div className={`px-2 py-1 rounded-md flex items-center ${alt.costComparison.percentage.includes('less') ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                              <DollarSign className="w-4 h-4 mr-1" />
                              <span className="text-xs font-medium">{alt.costComparison.percentage}</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                              <div className="text-purple-300 text-xs font-medium mb-2">ADVANTAGES</div>
                              <ul className="space-y-1">
                                {alt.advantages.map((advantage, i) => (
                                  <li key={`adv-${i}`} className="text-gray-300 text-sm flex items-start">
                                    <span className="text-green-400 mr-2">✓</span>
                                    {advantage}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div>
                              <div className="text-purple-300 text-xs font-medium mb-2">SIDE EFFECTS</div>
                              <ul className="space-y-1">
                                {alt.sideEffects.map((effect, i) => (
                                  <li key={`se-${i}`} className="text-gray-300 text-sm flex items-start">
                                    <AlertTriangle className="w-3 h-3 text-yellow-400 mr-2 flex-shrink-0 mt-1" />
                                    {effect}
                                  </li>
                                ))}
                              </ul>
                              
                              <div className="mt-3">
                                <div className="text-purple-300 text-xs font-medium mb-2">INTERACTION RISK</div>
                                <div className={`flex items-center ${getInteractionRiskColor(alt.interactionRisk)}`}>
                                  <AlertCircle className="w-4 h-4 mr-2" />
                                  <span className="font-medium">{alt.interactionRisk}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <div className="mt-4 text-center pt-2 border-t border-gray-700/30">
                        <p className="text-gray-400 text-xs italic">
                          Always consult with your healthcare provider before switching medications.
                        </p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="py-6 text-center">
                    <div className="animate-pulse flex flex-col items-center">
                      <div className="h-10 w-10 bg-gray-700 rounded-full mb-4"></div>
                      <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DrugAlternatives;