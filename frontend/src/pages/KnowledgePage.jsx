import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getKnowledgeGraph } from '../api/query';
import KnowledgeGraphEnhanced from '../components/KnowledgeGraphEnhanced';

const KnowledgePage = () => {
    const navigate = useNavigate();
    const userId = localStorage.getItem('user_id') || 'default';
    
    const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
    const [selectedNode, setSelectedNode] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getKnowledgeGraph(userId);
                if (data) setGraphData(data);
            } catch (err) {
                console.error("Failed to fetch graph data", err);
                // Graceful degradation: show sample graph so the page is usable even when the backend is unavailable
                setGraphData({
                    nodes: [
                        { id: '1', label: 'React 19' },
                        { id: '2', label: 'Concurrent Rendering' },
                        { id: '3', label: 'Server Components' },
                        { id: '4', label: 'Tailwind v4' },
                        { id: '5', label: 'D3.js' },
                        { id: '6', label: 'Data Visualization' },
                        { id: '7', label: 'State Management' }
                    ],
                    edges: [
                        { source: '1', target: '2' },
                        { source: '1', target: '3' },
                        { source: '1', target: '5' },
                        { source: '5', target: '6' },
                        { source: '2', target: '7' },
                        { source: '3', target: '7' }
                    ]
                });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userId]);

    const handleAskInChat = () => {
        if (!selectedNode) return;
        // Navigation with state to pre-fill chat
        navigate('/chat', { state: { initialQuery: `Tell me about ${selectedNode.label || selectedNode.id}` } });
    };

    // Calculate concept link counts for the right panel
    const conceptList = graphData.nodes.map(node => {
        const connections = (graphData.edges || graphData.links || []).filter(e => 
            (e.source.id || e.source) === node.id || (e.target.id || e.target) === node.id
        ).length;
        return { ...node, connections };
    }).sort((a, b) => b.connections - a.connections);

    if (loading) return (
        <div className="h-full flex items-center justify-center">
            <div className="text-teal-600 font-bold animate-pulse">Mapping your knowledge universe...</div>
        </div>
    );

    return (
        <div className="flex h-[calc(100vh-var(--topbar-height)-48px)] gap-4 animate-page-enter">
            {/* Left Panel: Graph Canvas */}
            <div className="flex-1 bg-white/40 rounded-[16px] border border-white/20 backdrop-blur-sm overflow-hidden shadow-sm relative">
                <KnowledgeGraphEnhanced 
                    data={graphData} 
                    onNodeSelect={setSelectedNode} 
                    selectedNodeId={selectedNode?.id} 
                />
            </div>

            {/* Right Panel: Concept Details */}
            <div className="w-[320px] flex flex-col bg-white/40 rounded-[16px] border border-white/20 backdrop-blur-sm overflow-hidden shadow-sm">
                <div className="p-4 border-b border-teal-100 bg-white/50">
                    <h2 className="text-[14px] font-bold text-teal-800 uppercase tracking-wider">Top Concepts</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {conceptList.map((concept) => (
                        <button
                            key={concept.id}
                            onClick={() => setSelectedNode(concept)}
                            className={`w-full text-left p-3 rounded-[10px] transition-all flex items-center gap-3 ${
                                selectedNode?.id === concept.id 
                                    ? 'bg-[#CCFBF1] border border-teal-200' 
                                    : 'hover:bg-white/50 border border-transparent'
                            }`}
                        >
                            <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                            <div className="flex-1">
                                <div className="text-[13px] font-bold text-gray-800">{concept.label || concept.id}</div>
                            </div>
                            <div className="text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                                {concept.connections} links
                            </div>
                        </button>
                    ))}
                </div>

                <div className="p-4 space-y-4">
                    {selectedNode && (
                        <div className="animate-[slideUp_0.3s_ease-out]">
                            <div className="p-4 bg-teal-50 border border-teal-100 rounded-[12px] space-y-2 mb-4">
                                <h3 className="text-[14px] font-black text-teal-800">{selectedNode.label || selectedNode.id}</h3>
                                <p className="text-[11px] text-teal-600 font-medium leading-relaxed">
                                    This concept is connected to {conceptList.find(c => c.id === selectedNode.id)?.connections} other topics in your learning path.
                                </p>
                            </div>
                            <button 
                                onClick={handleAskInChat}
                                className="w-full bg-[#14B8A6] hover:bg-[#0D9488] text-white py-3 rounded-[12px] font-bold shadow-lg shadow-teal-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                Ask in Chat
                            </button>
                        </div>
                    )}
                    
                    {!selectedNode && (
                        <div className="p-4 bg-[#CCFBF1] text-[#0F6E56] text-[11px] font-bold rounded-[10px] text-center border border-teal-100">
                            Click any node to explore its relations or ask the AI tutor
                        </div>
                    )}
                </div>
            </div>
            
            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(10px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default KnowledgePage;
