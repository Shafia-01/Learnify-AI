import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadFile, uploadYoutube } from '../api/ingest';

const Upload = () => {
  const [files, setFiles] = useState([]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => 
      f.name.endsWith('.pdf') || f.name.endsWith('.ppt') || f.name.endsWith('.txt') || f.name.endsWith('.pptx')
    );
    setFiles(prev => [...prev, ...droppedFiles.map(file => ({ type: 'file', data: file, status: 'pending' }))]);
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleAddYoutube = () => {
    if (youtubeUrl && (youtubeUrl.includes('youtube.com') || youtubeUrl.includes('youtu.be'))) {
      setFiles(prev => [...prev, { type: 'youtube', data: youtubeUrl, status: 'pending' }]);
      setYoutubeUrl('');
    }
  };

  const processAll = async () => {
    setIsProcessing(true);
    let completed = 0;
    
    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      if (item.status === 'done') {
        completed++;
        continue;
      }

      setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'processing' } : f));
      
      try {
        if (item.type === 'file') {
          await uploadFile(item.data);
        } else {
          await uploadYoutube(item.data);
        }
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'done' } : f));
      } catch (e) {
        setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error' } : f));
      }
      
      completed++;
      setProgress(Math.round((completed / files.length) * 100));
    }
    
    setIsProcessing(false);
    navigate('/chat');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-blue-400">Upload Knowledge Source</h1>
        
        <div 
          onDrop={handleDrop} 
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-gray-600 rounded-xl p-12 text-center hover:border-blue-500 transition-colors bg-gray-800"
        >
          <div className="text-5xl mb-4">📁</div>
          <p className="text-xl mb-2">Drag and drop files here</p>
          <p className="text-gray-400">Supports PDF, PPT, TXT</p>
        </div>

        <div className="flex gap-4">
          <input 
            type="text" 
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="Paste YouTube URL"
            className="flex-1 p-3 bg-gray-800 rounded border border-gray-700 outline-none focus:border-blue-500"
          />
          <button 
            onClick={handleAddYoutube}
            className="px-6 bg-gray-700 hover:bg-gray-600 rounded font-semibold transition-colors"
          >
            Add URL
          </button>
        </div>

        {files.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl mb-4 font-semibold">Queue</h2>
            <ul className="space-y-3 mb-6">
              {files.map((f, idx) => (
                <li key={idx} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{f.type === 'file' ? '📄' : '🎥'}</span>
                    <span>{f.type === 'file' ? f.data.name : f.data}</span>
                  </div>
                  <span className={`text-sm ${f.status === 'done' ? 'text-green-400' : f.status === 'processing' ? 'text-blue-400 animate-pulse' : f.status === 'error' ? 'text-red-400' : 'text-gray-400'}`}>
                    {f.status.toUpperCase()}
                  </span>
                </li>
              ))}
            </ul>
            
            {isProcessing && (
              <div className="w-full bg-gray-700 rounded-full h-2.5 mb-6">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
            )}

            <button 
              onClick={processAll}
              disabled={isProcessing}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded font-bold transition-colors disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Process All'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Upload;
