import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';

const FlashcardFlip = () => {
    const navigate = useNavigate();
    const userId = localStorage.getItem('user_id') || 'default';
    
    const [cards, setCards] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isEnded, setIsEnded] = useState(false);
    const [scoreResponse, setScoreResponse] = useState(null);

    useEffect(() => {
        const fetchCards = async () => {
            try {
                const subject = localStorage.getItem('study_subject');
                const queryParams = subject ? `?subject=${encodeURIComponent(subject)}` : '';
                const res = await client.get(`/api/games/flashcards/${userId}${queryParams}`);
                setCards(res.data);
            } catch (err) {
                console.error("Failed to fetch flashcards", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCards();
    }, [userId]);

    const handleNext = async () => {
        setIsFlipped(false);
        if (currentIndex < cards.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            await submitScore(cards.length * 10);
            setIsEnded(true);
        }
    };

    const submitScore = async (finalScore) => {
        try {
            const res = await client.post('/api/games/score', {
                user_id: userId,
                game_name: 'flashcard',
                score: finalScore,
                duration_seconds: 120
            });
            setScoreResponse(res.data);
        } catch (err) { console.error("Failed to submit FlashcardFlip score", err); }
    };

    const handleEndGame = async () => {
        // Score based on how many cards were reviewed
        const reviewedScore = (currentIndex + 1) * 10;
        await submitScore(reviewedScore);
        setIsEnded(true);
    };

    if (isLoading) return <div className="flex items-center justify-center h-[60vh] text-[#8B5CF6] font-bold animate-pulse">Preparing Cards...</div>;
    if (cards.length === 0) return <div className="text-center p-10 font-bold text-gray-900">No cards available. Upload material first!</div>;

    if (isEnded) {
        const finalScore = scoreResponse?.submitted_score || (currentIndex + 1) * 10;
        return (
            <div className="max-w-2xl mx-auto space-y-8 animate-page-enter">
                <div className="p-10 text-center space-y-6 bg-gradient-to-br from-[#5B21B6] to-[#2E1065] text-white rounded-3xl shadow-2xl border border-purple-900/50">
                    <h2 className="text-3xl font-black text-white">Session Complete! 🎉</h2>
                    <div className="text-5xl font-black text-amber-300">{finalScore} pts</div>
                    <p className="text-purple-200 font-bold">
                        You reviewed {currentIndex + 1} of {cards.length} cards
                    </p>
                    {scoreResponse && (
                        <div className="space-y-2">
                            <p className="text-sm font-bold text-purple-100">{scoreResponse.message}</p>
                            <div className="flex gap-4 justify-center text-xs font-bold uppercase tracking-wider">
                                <span className="bg-white/10 px-3 py-1 rounded-full">High Score: {scoreResponse.new_high_score}</span>
                                <span className="bg-white/10 px-3 py-1 rounded-full">+{scoreResponse.xp_awarded} XP</span>
                            </div>
                        </div>
                    )}
                    <div className="flex gap-3 justify-center mt-2">
                        <button onClick={() => window.location.reload()} className="bg-white text-[#7C3AED] hover:bg-purple-50 px-6 py-3 rounded-xl font-bold transition-all shadow-md">Play Again</button>
                        <button onClick={() => navigate('/games')} className="bg-[#6D28D9] hover:bg-[#5B21B6] text-white px-6 py-3 rounded-xl font-bold border border-purple-400 shadow-md transition-all">Back to Games</button>
                    </div>
                </div>
            </div>
        );
    }

    const current = cards[currentIndex];

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-page-enter">
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/games')} className="p-2 hover:bg-gray-100 rounded-lg">🔙</button>
                    <h1 className="text-2xl font-black text-gray-900">Flashcard Flip</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-sm font-bold text-[#8B5CF6] uppercase tracking-wider">
                        Card {currentIndex + 1} / {cards.length}
                    </div>
                    <button
                        onClick={handleEndGame}
                        className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-lg shadow-red-500/20 transition-all active:scale-95 uppercase tracking-wide"
                    >
                        🏁 End Game
                    </button>
                </div>
            </header>

            <div 
                onClick={() => setIsFlipped(!isFlipped)}
                className={`relative w-full h-[400px] cursor-pointer transition-all duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
            >
                {/* Front Side */}
                <div className="absolute inset-0 bg-white border-2 border-[#8B5CF6]/20 rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-xl [backface-visibility:hidden]">
                    <div className="text-[10px] font-black text-[#8B5CF6] uppercase tracking-[4px] mb-4 opacity-70">Concept</div>
                    <h2 className="text-2xl font-black text-gray-900 leading-tight">{current.front}</h2>
                    {current.hint && <p className="mt-6 text-sm text-gray-900 italic">Hint: {current.hint}</p>}
                    <div className="mt-10 text-[10px] text-gray-900 font-bold uppercase">Click to flip</div>
                </div>

                {/* Back Side */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED] rounded-3xl p-10 flex flex-col items-center justify-center text-center shadow-xl [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <div className="text-[10px] font-black text-white/70 uppercase tracking-[4px] mb-4">Explanation</div>
                    <p className="text-xl font-bold text-white leading-relaxed">{current.back}</p>
                    <div className="mt-10 text-[10px] text-white/60 font-bold uppercase">Click to flip back</div>
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
