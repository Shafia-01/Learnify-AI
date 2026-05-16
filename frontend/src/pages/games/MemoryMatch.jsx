import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';

const MemoryMatch = () => {
    const navigate = useNavigate();
    const userId = localStorage.getItem('user_id') || 'default';
    
    const [cards, setCards] = useState([]);
    const [flipped, setFlipped] = useState([]);
    const [matched, setMatched] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [score, setScore] = useState(0);
    const [isEnded, setIsEnded] = useState(false);
    const [scoreResponse, setScoreResponse] = useState(null);
    const [lockBoard, setLockBoard] = useState(false);

    // Ref to track current score without stale closure issues
    const scoreRef = useRef(0);

    useEffect(() => {
        const fetchPairs = async () => {
            try {
                const res = await client.get(`/api/games/memory-match/${userId}`);
                const pairs = res.data;
                const gameCards = [];
                pairs.forEach((p, i) => {
                    gameCards.push({ id: `p${i}-term`, content: p.term, matchId: i, type: 'term' });
                    gameCards.push({ id: `p${i}-match`, content: p.match, matchId: i, type: 'match' });
                });
                setCards(gameCards.sort(() => Math.random() - 0.5));
            } catch (err) {
                console.error("Failed to fetch memory match pairs", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPairs();
    }, [userId]);

    const handleFlip = (card) => {
        if (isEnded || lockBoard || matched.includes(card.id) || flipped.includes(card.id)) return;

        const newFlipped = [...flipped, card.id];
        setFlipped(newFlipped);

        if (newFlipped.length === 2) {
            setLockBoard(true);
            const firstCard = cards.find(c => c.id === newFlipped[0]);
            const secondCard = cards.find(c => c.id === newFlipped[1]);

            if (firstCard.matchId === secondCard.matchId) {
                // Match found!
                setMatched(prev => [...prev, firstCard.id, secondCard.id]);
                setScore(prev => {
                    const next = prev + 200;
                    scoreRef.current = next;
                    return next;
                });
                setFlipped([]);
                setLockBoard(false);
            } else {
                // No match — flip back after a delay
                setTimeout(() => {
                    setFlipped([]);
                    setLockBoard(false);
                }, 1200);
            }
        }
    };

    useEffect(() => {
        if (matched.length === cards.length && cards.length > 0 && !isEnded) {
            setIsEnded(true);
            submitScore();
        }
    }, [matched, cards]);

    const submitScore = async () => {
        try {
            const res = await client.post('/api/games/score', {
                user_id: userId,
                game_name: 'memory',
                score: scoreRef.current,
                duration_seconds: 90
            });
            setScoreResponse(res.data);
        } catch (err) { console.error("Failed to submit MemoryMatch score", err); }
    };

    const handleEndGame = () => {
        setIsEnded(true);
        submitScore();
    };

    if (isLoading) return <div className="flex items-center justify-center h-[60vh] text-[#10B981] font-bold animate-pulse">Shuffling Cards...</div>;
    
    if (cards.length === 0) return (
        <div className="card p-10 text-center space-y-4 max-w-md mx-auto">
            <h2 className="text-2xl font-black text-gray-800">Empty Deck</h2>
            <p className="text-gray-600 text-sm">We couldn't extract enough pairs for a game. Upload more detailed material!</p>
            <button onClick={() => navigate('/upload')} className="w-full bg-[#10B981] text-white py-3 rounded-xl font-bold font-black">Go to Upload</button>
        </div>
    );

    const allMatched = matched.length === cards.length;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-page-enter">
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/games')} className="p-2 hover:bg-gray-100 rounded-lg">🔙</button>
                    <h1 className="text-2xl font-black text-gray-800">Memory Match</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-xl font-mono font-bold text-[#10B981]">Score: {score}</div>
                    {!isEnded && (
                        <button
                            onClick={handleEndGame}
                            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-lg shadow-red-500/20 transition-all active:scale-95 uppercase tracking-wide"
                        >
                            🏁 End Game
                        </button>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {cards.map((card) => {
                    const isRevealed = flipped.includes(card.id) || matched.includes(card.id);
                    const isMatched = matched.includes(card.id);
                    
                    return (
                        <div 
                            key={card.id}
                            onClick={() => handleFlip(card)}
                            style={{
                                minHeight: '120px',
                                cursor: isMatched ? 'default' : 'pointer',
                            }}
                            className={`rounded-2xl transition-all duration-300 flex items-center justify-center p-3 select-none ${
                                isMatched
                                    ? 'bg-[#10B981] text-white shadow-lg shadow-emerald-500/20 scale-95'
                                    : isRevealed
                                        ? 'bg-white border-2 border-[#10B981] shadow-md'
                                        : 'bg-[#D1FAE5] border-2 border-[#10B981]/20 hover:shadow-md hover:scale-[1.03] active:scale-95'
                            }`}
                        >
                            {isRevealed ? (
                                <span className={`text-sm font-bold leading-snug text-center ${isMatched ? 'text-white' : 'text-gray-900'}`}>
                                    {card.content}
                                </span>
                            ) : (
                                <span className="text-3xl">🧩</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {isEnded && (
                <div className="card p-8 bg-white border-2 border-[#10B981] text-center space-y-4">
                    <div className="w-16 h-16 bg-[#D1FAE5] rounded-full flex items-center justify-center mx-auto text-3xl">
                        {allMatched ? '🏆' : '🎮'}
                    </div>
                    <h2 className="text-2xl font-black text-gray-900">{allMatched ? 'Amazing Memory!' : 'Game Ended!'}</h2>
                    <div className="text-4xl font-black text-[#10B981]">{scoreRef.current} pts</div>
                    {scoreResponse && (
                        <div className="space-y-3">
                            <p className="text-sm font-bold text-gray-800">{scoreResponse.message}</p>
                            <div className="flex gap-4 justify-center text-xs font-bold uppercase tracking-wider">
                                <span className="bg-[#D1FAE5] text-[#065F46] px-4 py-1.5 rounded-full">High Score: {scoreResponse.new_high_score}</span>
                                <span className="bg-[#FEF3C7] text-[#92400E] px-4 py-1.5 rounded-full">+{scoreResponse.xp_awarded} XP</span>
                            </div>
                        </div>
                    )}
                    <div className="flex gap-3 justify-center mt-4 pt-2">
                        <button onClick={() => window.location.reload()} className="bg-[#10B981] hover:bg-[#059669] text-white px-8 py-3 rounded-xl font-black uppercase text-sm shadow-lg shadow-emerald-500/20 transition-all">Play Again</button>
                        <button onClick={() => navigate('/games')} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-8 py-3 rounded-xl font-bold text-sm transition-all">Back to Games</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MemoryMatch;
