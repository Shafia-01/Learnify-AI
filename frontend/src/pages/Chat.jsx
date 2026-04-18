import React, { useState, useEffect } from 'react';
import { askQuestion, getLearningPath, getKnowledgeGraph } from '../api/query';
import { speakText } from '../api/voice';
import KnowledgeGraph from '../components/KnowledgeGraph';
import VoiceButton from '../components/VoiceButton';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [level, setLevel] = useState(localStorage.getItem('level') || 'Beginner');
  const [activeTab, setActiveTab] = useState('Learning Path');
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Tab states
  const [learningPath, setLearningPath] = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  
  useEffect(() => {
    localStorage.setItem('level', level);
  }, [level]);

  useEffect(() => {
    // Load mock or real data
    setLearningPath(['Intro to subject', 'Core concepts', 'Advanced details']);
    setGraphData({
      nodes: [{id: '1', label: 'ML'}, {id: '2', label: 'Neural Nets'}],
      edges: [{source: '1', target: '2'}]
    });
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    try {
      const response = await askQuestion(userMsg, level.toLowerCase());
      const aiResponse = response.answer || "No answer returned.";
      // Normalise citations: backend returns source_file / page_or_timestamp
      const citations = (response.citations || []).map(c => ({
        source: c.source_file || c.source || '',
        page: c.page_or_timestamp || c.page || '',
        text: c.text || '',
      }));
      
      setMessages(prev => [...prev, { role: 'ai', content: aiResponse, citations }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Connection to AI failed.', citations: [] }]);
    }
  };

  const handleNodeClick = async (label) => {
    setMessages(prev => [...prev, { role: 'user', content: `Tell me about ${label}` }]);
    try {
      const res = await askQuestion(label);
      setMessages(prev => [...prev, { role: 'ai', content: res.answer || `Info about ${label}`, citations: res.citations || [] }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Error loading info.' }]);
    }
  };

  const handleSpeak = async (text) => {
    if (!text || isSpeaking) return;
    setIsSpeaking(true);
    try {
      const audioUrl = await speakText(text);
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsSpeaking(false);
      audio.play();
    } catch (e) {
      console.error("Speech failed", e);
      setIsSpeaking(false);
    }
  };

  return (
    <div className="h-screen flex bg-gray-900 text-white overflow-hidden">
      {/* Left panel: Chat */}
      <div className="w-1/2 flex flex-col border-r border-gray-700">
        <div className="p-4 bg-gray-800 flex justify-between items-center border-b border-gray-700">
          <h2 className="font-bold text-xl">Chat</h2>
          <div className="flex gap-3 items-center">
            <span className="px-3 py-1 bg-green-900 text-green-400 font-bold rounded-full text-xs border border-green-700">
              {localStorage.getItem('provider') || 'Provider'}
            </span>
            <select 
              value={level} 
              onChange={(e) => setLevel(e.target.value)}
              className="bg-gray-700 p-2 rounded outline-none border border-gray-600"
            >
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-xl ${msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-800'} relative group`}>
                <p>{msg.content}</p>
                {msg.role === 'ai' && (
                  <button 
                    onClick={() => handleSpeak(msg.content)}
                    className="absolute -right-10 top-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Speak"
                  >
                    {isSpeaking ? '⏳' : '🔊'}
                  </button>
                )}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {msg.citations.map((cit, i) => (
                      <span key={i} className="text-xs bg-gray-700 px-2 py-1 rounded cursor-help" title={cit.text}>
                        [{cit.source} p.{cit.page}]
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-gray-800 border-t border-gray-700 flex gap-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question..."
            className="flex-1 p-3 bg-gray-700 rounded-lg outline-none focus:border-blue-500 border border-transparent"
          />
          <VoiceButton onTranscription={(txt) => setInput(txt)} />
          <button onClick={handleSend} className="bg-blue-600 px-6 rounded-lg font-bold hover:bg-blue-700 transition">
            Send
          </button>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-1/2 flex flex-col bg-gray-800">
        <div className="flex border-b border-gray-700">
          {['Learning Path', 'Knowledge Graph', 'Progress'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 p-4 text-center font-semibold transition-colors ${activeTab === tab ? 'bg-gray-700 text-blue-400 border-b-2 border-blue-400' : 'hover:bg-gray-700 text-gray-400'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'Learning Path' && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold mb-4">Your Path</h3>
              {learningPath.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-gray-700 p-4 rounded-lg">
                  <input type="checkbox" className="w-5 h-5 accent-blue-500" />
                  <span className="text-lg">{item}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'Knowledge Graph' && (
            <div className="h-full w-full bg-gray-900 rounded-xl border border-gray-700 overflow-hidden relative">
              <KnowledgeGraph data={graphData} onNodeClick={handleNodeClick} />
            </div>
          )}

          {activeTab === 'Progress' && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
               <div className="text-6xl mb-4">📊</div>
               <p className="text-xl">Analytics placeholder</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
