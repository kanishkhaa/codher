import React, { useState, useEffect } from 'react';
import { Graph } from 'react-d3-graph';
import { BarChart2, Pill, FileText, AlertCircle } from 'lucide-react';
import Sidebar from '../../components/sidebar';

const Visualizations = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [interactionGraph, setInteractionGraph] = useState({ nodes: [], links: [] });
  const [treatmentPlan, setTreatmentPlan] = useState({ optimal_path: [], alternative_paths: [], costs: [] });
  const [loadingGraph, setLoadingGraph] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [errorGraph, setErrorGraph] = useState(null);
  const [errorPlan, setErrorPlan] = useState(null);

  // Fetch drug interaction graph
  const fetchInteractionGraph = async () => {
    try {
      const response = await fetch('http://localhost:5000/visualize-interactions');
      if (!response.ok) throw new Error('Failed to fetch interaction graph');
      const data = await response.json();

      // Deduplicate nodes to avoid React key warning
      const uniqueNodes = Array.from(new Set(data.nodes)).map(node => ({
        id: node,
        color: '#4B5EAA',
        size: 300,
      }));

      setInteractionGraph({
        nodes: uniqueNodes,
        links: data.edges.map(edge => ({
          source: edge.source,
          target: edge.target,
          color: '#FF6B6B',
        })),
      });

      setLoadingGraph(false);
    } catch (error) {
      console.error('Error fetching interaction graph:', error);
      setErrorGraph('Failed to load drug interaction graph. Please try again.');
      setLoadingGraph(false);
    }
  };

  // Fetch treatment plan
  const fetchTreatmentPlan = async () => {
    try {
      const response = await fetch('http://localhost:5000/treatment-plan');
      if (!response.ok) throw new Error('Failed to fetch treatment plan');
      const data = await response.json();
      setTreatmentPlan({
        optimal_path: data.optimal_path || [],
        alternative_paths: data.alternative_paths || [],
        costs: data.costs || [],
      });
      setLoadingPlan(false);
    } catch (error) {
      console.error('Error fetching treatment plan:', error);
      setErrorPlan('Failed to load treatment plan. Please try again.');
      setLoadingPlan(false);
    }
  };

  useEffect(() => {
    fetchInteractionGraph();
    fetchTreatmentPlan();
  }, []);

  // Graph configuration
  const graphConfig = {
    nodeHighlightBehavior: true,
    node: {
      color: '#4B5EAA',
      size: 300,
      highlightStrokeColor: '#FF6B6B',
      fontSize: 12,
      highlightFontSize: 14,
      labelProperty: 'id',
    },
    link: {
      color: '#FF6B6B',
      highlightColor: '#FF6B6B',
      strokeWidth: 2,
    },
    directed: false,
    height: 400,
    width: window.innerWidth - 400,
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 via-slate-900 to-black text-white min-h-screen flex">
      <div className={`fixed inset-y-0 left-0 z-10 transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      </div>

      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'} p-8`}>
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-2">
            Visualizations
          </h1>
          <p className="text-gray-400 text-sm tracking-wide">Explore drug interactions and treatment plans</p>
        </div>

        <div className="space-y-8">
          {/* Drug Interaction Graph */}
          <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/30 shadow-xl">
            <div className="flex items-center mb-4">
              <Pill className="w-6 h-6 text-purple-400 mr-2" />
              <h2 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                Drug Interaction Graph
              </h2>
            </div>
            {loadingGraph ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
                <span className="ml-3 text-gray-400">Loading graph...</span>
              </div>
            ) : errorGraph ? (
              <div className="flex items-center justify-center py-8 text-red-400">
                <AlertCircle className="w-8 h-8 mr-2" />
                {errorGraph}
              </div>
            ) : interactionGraph.nodes.length > 0 ? (
              <Graph
                id="drug-interaction-graph"
                data={interactionGraph}
                config={graphConfig}
                className="w-full"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <BarChart2 className="w-16 h-16 text-gray-600 mb-4" />
                <p className="text-gray-400 text-center">No drug interactions available.</p>
              </div>
            )}
            <p className="text-sm text-gray-400 mt-4">
              Nodes represent medications, and edges indicate potential interactions.
            </p>
          </div>

          {/* Treatment Plan Visualization */}
          <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/30 shadow-xl">
            <div className="flex items-center mb-4">
              <FileText className="w-6 h-6 text-purple-400 mr-2" />
              <h2 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                Treatment Plan
              </h2>
            </div>
            {loadingPlan ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
                <span className="ml-3 text-gray-400">Loading treatment plan...</span>
              </div>
            ) : errorPlan ? (
              <div className="flex items-center justify-center py-8 text-red-400">
                <AlertCircle className="w-8 h-8 mr-2" />
                {errorPlan}
              </div>
            ) : treatmentPlan.optimal_path.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-200">Optimal Treatment Path</h3>
                  <div className="mt-2 p-4 bg-gray-700/50 rounded-lg">
                    <p className="text-gray-300">
                      {treatmentPlan.optimal_path.join(' → ')}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Cost: {treatmentPlan.costs[0] || 'N/A'}
                    </p>
                  </div>
                </div>
                {treatmentPlan.alternative_paths.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-200">Alternative Paths</h3>
                    <div className="space-y-2 mt-2">
                      {treatmentPlan.alternative_paths.map((path, index) => (
                        <div key={index} className="p-4 bg-gray-700/50 rounded-lg">
                          <p className="text-gray-300">
                            {path.join(' → ')}
                          </p>
                          <p className="text-sm text-gray-400 mt-1">
                            Cost: {treatmentPlan.costs[index + 1] || 'N/A'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <FileText className="w-16 h-16 text-gray-600 mb-4" />
                <p className="text-gray-400 text-center">No treatment plan available.</p>
              </div>
            )}
            <p className="text-sm text-gray-400 mt-4">
              Displays the optimal treatment path and alternatives based on your medication regimen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Visualizations;
