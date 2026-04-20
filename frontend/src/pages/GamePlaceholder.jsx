import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const GamePlaceholder = () => {
    const { gameId } = useParams();
    const navigate = useNavigate();

    return (
        <div className="max-w-4xl mx-auto h-[70vh] flex flex-col items-center justify-center space-y-6 text-center animate-page-enter">
            <div className="w-24 h-24 bg-[#FEFCE8] rounded-full flex items-center justify-center text-5xl border-4 border-[#EAB308] shadow-xl animate-bounce">
                🎮
            </div>
            <div className="space-y-2">
                <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">
                   {gameId?.replace('-', ' ')}
                </h1>
                <p className="text-gray-500 font-medium">Coming soon in the next update!</p>
            </div>
            <button 
                onClick={() => navigate('/games')}
                className="bg-[#EAB308] hover:bg-[#CA8A04] text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-yellow-500/20 transition-all flex items-center gap-2"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Back to Selection
            </button>
        </div>
    );
};

export default GamePlaceholder;
