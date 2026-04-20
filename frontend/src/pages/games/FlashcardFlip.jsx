import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';

const FlashcardFlip = () => {
    const navigate = useNavigate();
    const userId = localStorage.getItem('user_id') || 'default';
    
    const [cards, setCards] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchCards = async () => {
            try {
                const res = await client.get(`/api/games/flashcards/${userId}`);
                setCards(res.data);
            } catch (err) {
                console.error("Failed to fetch flashcards", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCards();
    }, [userId]);

    const handleNext = () => {
        setIsFlipped(false);
        if (currentIndex < cards.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            submitScore();
            navigate('/games');
        }
    };

    const submitScore = async () => {
        try {
            await client.post('/api/games/score', {
                user_id: userId,
                game_name: 'flashcard',
                score: cards.length * 10,
                duration_seconds: 120
            });
        } catch (err) { console.error("Failed to submit FlashcardFlip score", err); }
    };

    if (isLoading) return <div className="flex items-center justify-center h-[60vh] text-[#8B5CF6] font-bold animate-pulse">Preparing Cards...</div>;
    if (cards.length === 0) return <div className="text-center p-10 font-bold">No cards available. Upload material first!</div>;

    const current = cards[currentIndex];

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-page-enter">
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/games')} className="p-2 hover:bg-gray-100 rounded-lg">🔙</button>
                    <h1 className="text-2xl font-black text-gray-800">Flashcard Flip</h1>
                </div>
                <div className="text-sm font-bold text-[#8B5CF6] uppercase tracking-wider">
                    Card {currentIndex + 1} / {cards.length}
                </div>
            </header>

            <div 
                onClick={() => setIsFlipped(!isFlipped)}
                className={`relative w-full h-[400px] cursor-pointer transition-all duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
            >
                {/* Front Side */}
                <div className="absolute inset-0 bg-white border-2 border-[#8B5CF6]/20 rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-xl [backface-visibility:hidden]">
                    <div className="text-[10px] font-black text-[#8B5CF6] uppercase tracking-[4px] mb-4 opacity-50">Concept</div>
                    <h2 className="text-2xl font-black text-gray-800 leading-tight">{current.front}</h2>
                    {current.hint && <p className="mt-6 text-sm text-gray-400 italic">Hint: {current.hint}</p>}
                    <div className="mt-10 text-[10px] text-gray-300 font-bold uppercase">Click to flip</div>
                </div>

                {/* Back Side */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <div className="text-[10px] font-black text-white/50 uppercase tracking-[4px] mb-4">Explanation</div>
                    <p className="text-xl font-bold text-white leading-relaxed">{current.back}</p>
                    <div className="mt-10 text-[10px] text-white/40 font-bold uppercase">Click to flip back</div>
                </div>
            </div>

            <button 
                onClick={handleNext}
                className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
            >
                {currentIndex < cards.length - 1 ? 'Next Card' : 'Finish Session'}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7m0 0l-7 7m7-7H6" /></svg>
            </button>
        </div>
    );
};

export default FlashcardFlip;
