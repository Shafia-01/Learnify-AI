import { useState, useEffect } from 'react';
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
        if (flipped.length === 2 || matched.includes(card.id) || flipped.some(f => f.id === card.id)) return;
        
        const newFlipped = [...flipped, card];
        setFlipped(newFlipped);

        if (newFlipped.length === 2) {
            if (newFlipped[0].matchId === newFlipped[1].matchId) {
                setMatched([...matched, newFlipped[0].id, newFlipped[1].id]);
                setScore(prev => prev + 200);
                setFlipped([]);
            } else {
                setTimeout(() => setFlipped([]), 1000);
            }
        }
    };

    useEffect(() => {
        if (matched.length === cards.length && cards.length > 0) {
            submitScore();
        }
    }, [matched, cards]);

    const submitScore = async () => {
        try {
            await client.post('/api/games/score', {
                user_id: userId,
                game_name: 'memory',
                score: score,
                duration_seconds: 90
            });
        } catch (err) { console.error("Failed to submit MemoryMatch score", err); }
    };

    if (isLoading) return <div className="flex items-center justify-center h-[60vh] text-[#10B981] font-bold animate-pulse">Shuffling Cards...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-page-enter">
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/games')} className="p-2 hover:bg-gray-100 rounded-lg">🔙</button>
                    <h1 className="text-2xl font-black text-gray-800">Memory Match</h1>
                </div>
                <div className="text-xl font-mono font-bold text-[#10B981]">Score: {score}</div>
            </header>

            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {cards.map((card) => {
                    const isFlipped = flipped.some(f => f.id === card.id) || matched.includes(card.id);
                    const isMatched = matched.includes(card.id);
                    
                    return (
                        <div 
                            key={card.id}
                            onClick={() => handleFlip(card)}
                            className={`aspect-square rounded-2xl cursor-pointer transition-all duration-300 transform [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : 'hover:scale-[1.02] active:scale-95'}`}
                        >
                            {/* Front */}
                            <div className="absolute inset-0 bg-[#D1FAE5] border-2 border-[#10B981]/20 rounded-2xl flex items-center justify-center text-3xl [backface-visibility:hidden]">
                                🧩
                            </div>
                            {/* Back */}
                            <div className={`absolute inset-0 rounded-2xl p-3 flex items-center justify-center text-center shadow-inner [backface-visibility:hidden] [transform:rotateY(180deg)] ${isMatched ? 'bg-[#10B981] text-white' : 'bg-white border-2 border-[#10B981]'}`}>
                                <span className={`text-[11px] font-bold leading-tight ${isMatched ? 'text-white' : 'text-gray-700'}`}>
                                    {card.content}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {matched.length === cards.length && (
                <div className="card p-8 bg-[#10B981] text-white text-center space-y-4 animate-bounce">
                    <h2 className="text-2xl font-black">Amazing Memory! 🏆</h2>
                    <button onClick={() => window.location.reload()} className="bg-white text-[#10B981] px-6 py-2 rounded-lg font-black uppercase text-xs">Play Again</button>
                </div>
            )}
        </div>
    );
};

export default MemoryMatch;
