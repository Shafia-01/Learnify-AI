import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadFile } from '../api/ingest';

const Upload = () => {
    const navigate = useNavigate();
    const [files, setFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [overallProgress, setOverallProgress] = useState(0);
    const fileInputRef = useRef(null);

    const addFiles = (newFiles) => {
        const accepted = Array.from(newFiles).filter(f => 
            ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain'].includes(f.type) ||
            f.name.match(/\.(pdf|ppt|pptx|txt)$/i)
        );
        
        const mapped = accepted.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            type: 'file',
            name: file.name,
            data: file,
            status: 'PENDING',
            progress: 0
        }));
        
        setFiles(prev => [...prev, ...mapped]);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        addFiles(e.dataTransfer.files);
    };



    const processAll = async () => {
        if (files.length === 0) return;
        setIsProcessing(true);
        let completedCount = 0;

        for (let i = 0; i < files.length; i++) {
            const item = files[i];
            if (item.status === 'DONE') {
                completedCount++;
                continue;
            }

            // Set to processing
            setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'PROCESSING', progress: 30 } : f));

            try {
                if (item.type === 'file') {
                    await uploadFile(item.data);
                }
                
                setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'DONE', progress: 100 } : f));
            } catch (err) {
                console.error("Ingestion failed for", item.name, err);
                setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'ERROR', progress: 100 } : f));
            }

            completedCount++;
            setOverallProgress(Math.round((completedCount / files.length) * 100));
        }

        setIsProcessing(false);
        // After small delay, redirect to chat if at least one was successful
        setTimeout(() => {
            if (files.some(f => f.status === 'DONE')) {
                navigate('/chat');
            }
        }, 1500);
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'DONE': return 'bg-[#D1FAE5] text-[#065F46]';
            case 'PROCESSING': return 'bg-[#DBEAFE] text-[#1E40AF] animate-pulse';
            case 'ERROR': return 'bg-[#FEE2E2] text-[#991B1B]';
            default: return 'bg-[#F1F5F9] text-[#6b7280]';
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-page-enter">
            {/* Drop Zone */}
            <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`group border-[1.5px] border-dashed rounded-[12px] p-10 text-center transition-all cursor-pointer ${
                    isDragging 
                        ? 'border-[#F97316] bg-[#FFEDD5] scale-[1.02]' 
                        : 'border-[#FDBA74] bg-[#FFF7ED] hover:border-[#F97316]/50'
                }`}
            >
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    multiple 
                    className="hidden" 
                    onChange={(e) => addFiles(e.target.files)} 
                />
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-[16px] font-bold text-gray-800">Drag and drop files here</h2>
                        <p className="text-[12px] text-gray-400 font-medium tracking-tight uppercase">PDF, PPT, PPTX, TXT supported</p>
                    </div>
                    <button className="bg-[#F97316] hover:bg-[#EA580C] text-white px-6 py-2 rounded-full text-[13px] font-bold shadow-lg shadow-orange-500/20 transition-all">
                        Browse Files
                    </button>
                </div>
            </div>



            {/* Queue Panel */}
            {files.length > 0 && (
                <div className="card p-6 bg-white border-[0.5px] border-[#F97316]/20 space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-[14px] font-bold text-[#EA580C] uppercase tracking-wider">Queue ({files.length} items)</h3>
                        {isProcessing && <div className="text-[12px] font-bold text-orange-500 font-mono">{overallProgress}%</div>}
                    </div>

                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-orange-100">
                        {files.map((item) => (
                            <div key={item.id} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                                            {item.type === 'file' ? (
                                                <svg className="w-4.5 h-4.5 text-[#F97316]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                            ) : (
                                                <svg className="w-4.5 h-4.5 text-[#F97316]" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" /></svg>
                                            )}
                                        </div>
                                        <span className="text-[13px] font-bold text-gray-700 truncate max-w-[240px]">{item.name}</span>
                                    </div>
                                    <div className={`px-2 py-0.5 rounded-[4px] text-[10px] font-black tracking-tighter ${getStatusStyle(item.status)}`}>
                                        {item.status}
                                    </div>
                                </div>
                                {(item.status === 'PROCESSING' || item.status === 'DONE') && (
                                    <div className="h-[2px] w-full bg-gray-50 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-300 ${item.status === 'DONE' ? 'bg-green-500' : 'bg-[#F97316]'}`}
                                            style={{ width: `${item.progress}%` }}
                                        ></div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4 pt-2">
                        {isProcessing && (
                            <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-[#F97316] to-[#FB923C] transition-all duration-500"
                                    style={{ width: `${overallProgress}%` }}
                                ></div>
                            </div>
                        )}
                        <button 
                            onClick={processAll}
                            disabled={isProcessing || files.length === 0}
                            className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white py-3 rounded-[10px] font-bold shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isProcessing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Processing Materials...</span>
                                </>
                            ) : (
                                'Process All'
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Upload;
