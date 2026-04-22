import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { askQuestion, getLearningPath, getKnowledgeGraph } from '../api/query';
import { speakText, transcribeAudio } from '../api/voice';
import KnowledgeGraph from '../components/KnowledgeGraph';

const Chat = () => {
    const location = useLocation();
    const userId = localStorage.getItem('user_id') || 'default';
    const provider = localStorage.getItem('provider') || 'Groq';
    const model = localStorage.getItem('model') || 'llama-3.1-8b';

    const [messages, setMessages] = useState([
        { role: 'ai', content: "Hello! I'm your AI tutor. What would you like to learn today? I can help you with the uploaded materials or general topics.", citations: [] }
    ]);
    const [input, setInput] = useState('');
    const [level, setLevel] = useState(localStorage.getItem('level') || 'Beginner');

    useEffect(() => {
        if (location.state?.initialQuery) {
            handleSend(location.state.initialQuery);
        }
    }, [location.state]);
    const [activeTab, setActiveTab] = useState('Learning Path');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    
    // Data states
    const [learningPath, setLearningPath] = useState([]);
    const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
    
    const messagesEndRef = useRef(null);
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const fetchTabData = async () => {
            try {
                const [pathData, graphData] = await Promise.all([
                    getLearningPath(userId),
                    getKnowledgeGraph(userId)
                ]);
                
                // pathData is {"learning_path": [...]}
                if (pathData && Array.isArray(pathData.learning_path)) {
                    const formattedPath = pathData.learning_path.map((item, idx) => {
                        if (typeof item === 'string') {
                            return { 
                                name: item, 
                                status: idx === 0 ? 'Active' : 'Pending' 
                            };
                        }
                        return item;
                    });
                    setLearningPath(formattedPath);
                } else if (Array.isArray(pathData)) {
                    const formattedPath = pathData.map((item, idx) => {
                        if (typeof item === 'string') {
                            return { 
                                name: item, 
                                status: idx === 0 ? 'Active' : 'Pending' 
                            };
                        }
                        return item;
                    });
                    setLearningPath(formattedPath);
                }

                // graphData should be {nodes: [], edges: []}
                if (graphData && graphData.nodes && graphData.edges) {
                    setGraphData(graphData);
                }
            } catch (err) {
                console.error("Failed to fetch chat tab data", err);
            }
        };
        fetchTabData();
    }, [userId]);

    const handleSend = async (overrideInput) => {
        const query = overrideInput || input;
        if (!query.trim()) return;
        
        const userMsg = { role: 'user', content: query };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        try {
            const res = await askQuestion(query, level.toLowerCase());
            const citations = (res.citations || []).map(c => ({
                source: c.source_file || 'Source',
                page: c.page_or_timestamp || '1'
            }));
            const aiMsg = { role: 'ai', content: res.answer || "I'm sorry, I couldn't process that.", citations };
            setMessages(prev => [...prev, aiMsg]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'ai', content: "Error: Could not reach the AI tutor.", citations: [] }]);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];
            mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
            mediaRecorder.current.onstop = async () => {
                const blob = new Blob(audioChunks.current);
                const res = await transcribeAudio(blob);
                if (res?.text) setInput(res.text);
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorder.current.start();
            setIsRecording(true);
        } catch (err) { console.error("Microphone access error", err); }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.stop();
            setIsRecording(false);
        }
    };

    const handleSpeak = (text) => {
        const url = speakText(text);
        const audio = new Audio(url);
        setIsSpeaking(true);
        audio.onended = () => setIsSpeaking(false);
        audio.play().catch(() => setIsSpeaking(false));
    };

    const toggleTask = (index) => {
        setLearningPath(prev => prev.map((item, i) => {
            if (i === index) {
                return { ...item, status: item.status === 'Done' ? 'Pending' : 'Done' };
            }
            return item;
        }));
    };

    return (
        <div className="flex h-[calc(100vh-var(--topbar-height)-48px)] gap-4 animate-page-enter">
            {/* Left Panel: Chat */}
            <div className="w-1/2 flex flex-col bg-white/40 rounded-[16px] border border-white/20 backdrop-blur-sm overflow-hidden shadow-sm">
                {/* Header */}
                <div className="px-4 py-3 border-b border-[#8B5CF6]/10 flex justify-between items-center bg-white/50">
                    <div className="bg-[#EDE9FE] px-3 py-1 rounded-full text-[11px] font-bold text-[#5B21B6] uppercase tracking-wider">
                        Chat Mode
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-md border border-[#8B5CF6]/10 shadow-sm">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Level</span>
                            <select 
                                value={level}
                                onChange={(e) => setLevel(e.target.value)}
                                className="text-[12px] font-semibold bg-transparent outline-none text-[#5B21B6]"
                            >
                                <option>Beginner</option>
                                <option>Intermediate</option>
                                <option>Advanced</option>
                            </select>
                        </div>
                        <div className="bg-[#1e3a2f]/10 border border-[#2d5c45]/20 px-2.5 py-1 rounded-md">
                            <span className="text-[11px] font-bold text-[#065F46] uppercase">{provider}</span>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-purple-200">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className="max-w-[85%] space-y-1">
                                <div className={`px-4 py-2.5 shadow-sm text-[13.5px] leading-relaxed transition-all ${
                                    msg.role === 'user' 
                                        ? 'bg-[#8B5CF6] text-white rounded-[16px] rounded-br-[4px]' 
                                        : 'bg-white text-gray-800 rounded-[16px] rounded-bl-[4px] border border-[#8B5CF6]/20'
                                }`}>
                                    {msg.content}
                                    {msg.role === 'ai' && (
                                        <button 
                                            onClick={() => handleSpeak(msg.content)}
                                            className="ml-2 inline-flex items-center justify-center text-purple-400 hover:text-purple-600 transition-colors"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                        </button>
                                    )}
                                </div>
                                {msg.role === 'ai' && msg.citations?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 px-1">
                                        {msg.citations.map((c, ci) => (
                                            <div key={ci} className="bg-[#EDE9FE] text-[#5B21B6] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#8B5CF6]/10 flex items-center gap-1">
                                                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 4.804A7.994 7.994 0 002 12a7.994 7.994 0 007-7.196V4.804zM11 4.804v.396A7.994 7.994 0 0018 12a7.994 7.994 0 00-7-7.196z" /></svg>
                                                {c.source} · p.{c.page}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <div className="p-4 bg-white/50 border-t border-[#8B5CF6]/10">
                    <div className="bg-white border border-[#8B5CF6]/30 rounded-[12px] p-1.5 flex items-center gap-2 shadow-sm focus-within:ring-2 ring-purple-500/10 transition-all">
                        <button 
                            onMouseDown={startRecording}
                            onMouseUp={stopRecording}
                            className={`p-2 rounded-lg transition-colors ${isRecording ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:bg-gray-100 hover:text-[#8B5CF6]'}`}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        </button>
                        <input 
                            type="text" 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Type a message..."
                            className="flex-1 bg-transparent border-none outline-none text-[13.5px] px-2 text-gray-700 placeholder:text-gray-400"
                        />
                        <button 
                            onClick={() => handleSend()}
                            className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white p-2 rounded-[8px] shadow-lg shadow-purple-500/20 transition-all active:scale-95"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Panel: Tabs */}
            <div className="w-1/2 flex flex-col bg-white/40 rounded-[16px] border border-white/20 backdrop-blur-sm overflow-hidden shadow-sm">
                {/* Tabs Header */}
                <div className="flex bg-white/30 border-b border-[#8B5CF6]/10 p-1.5 gap-1.5">
                    {['Learning Path', 'Knowledge Graph', 'Progress'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2 text-[12px] font-bold transition-all rounded-[10px] ${
                                activeTab === tab 
                                    ? 'bg-[#8B5CF6] text-white shadow-md' 
                                    : 'bg-white/50 text-gray-500 hover:bg-white hover:text-gray-800'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {activeTab === 'Learning Path' && (
                        <div className="space-y-3">
                            {learningPath.map((item, i) => (
                                <div 
                                    key={i} 
                                    className={`card p-3 flex items-center gap-3 transition-all ${
                                        item.status === 'Active' ? 'bg-[#EDE9FE] border-[#8B5CF6] border-[1.5px]' : 'bg-white border-transparent'
                                    }`}
                                >
                                    <input 
                                        type="checkbox" 
                                        checked={item.status === 'Done'}
                                        onChange={() => toggleTask(i)}
                                        className="w-4 h-4 rounded border-gray-300 text-[#8B5CF6] focus:ring-purple-500 accent-[#8B5CF6] cursor-pointer" 
                                    />
                                    <div className="flex-1">
                                        <div className="text-[13px] font-bold text-gray-800">{item.name}</div>
                                    </div>
                                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${
                                        item.status === 'Done' ? 'bg-green-100 text-green-600' :
                                        item.status === 'Active' ? 'bg-blue-100 text-blue-600' :
                                        'bg-gray-100 text-gray-400'
                                    }`}>
                                        {item.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'Knowledge Graph' && (
                        <div className="h-full bg-white/50 rounded-xl border border-[#8B5CF6]/10 relative overflow-hidden backdrop-blur-md">
                            <KnowledgeGraph data={graphData} onNodeClick={(label) => handleSend(`Tell me about ${label}`)} />
                        </div>
                    )}

                    {activeTab === 'Progress' && (
                         <div className="flex flex-col items-center justify-center h-full opacity-40 grayscale group hover:grayscale-0 transition-all duration-500">
                             <div className="w-16 h-16 bg-[#EDE9FE] rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <svg className="w-8 h-8 text-[#8B5CF6]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                             </div>
                             <p className="text-[14px] font-bold tracking-tight text-[#5B21B6]">Analytics coming soon</p>
                         </div>
                    )}
                </div>

                {/* Voice Mode Status Bar */}
                <div className="h-12 bg-[#EDE9FE]/80 border-t border-[#8B5CF6]/10 px-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex gap-1 items-end h-3">
                            <div className="w-1 bg-[#8B5CF6] rounded-full animate-[bounce_1s_infinite_0s]" style={{height: '60%'}}></div>
                            <div className="w-1 bg-[#8B5CF6] rounded-full animate-[bounce_1s_infinite_0.2s]" style={{height: '100%'}}></div>
                            <div className="w-1 bg-[#8B5CF6] rounded-full animate-[bounce_1s_infinite_0.4s]" style={{height: '40%'}}></div>
                            <div className="w-1 bg-[#8B5CF6] rounded-full animate-[bounce_1s_infinite_0.1s]" style={{height: '80%'}}></div>
                        </div>
                        <span className="text-[11px] font-bold text-[#5B21B6] uppercase tracking-wider">Voice Mode</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chat;
