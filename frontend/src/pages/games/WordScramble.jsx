import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';

const WordScramble = () => {
    const navigate = useNavigate();
    const userId = localStorage.getItem('user_id') || 'default';
    
    const [words, setWords] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userInput, setUserInput] = useState('');
    const [score, setScore] = useState(0);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [scoreResponse, setScoreResponse] = useState(null);

    // Ref to track current score without stale closure issues
    const scoreRef = useRef(0);

    useEffect(() => {
        const fetchWords = async () => {
            try {
                const res = await client.get(`/api/games/word-scramble/${userId}`);
                setWords(res.data);
            } catch (err) {
                console.error("Failed to fetch words", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchWords();
    }, [userId]);

    const handleCheck = () => {
        const currentWord = words[currentIndex];
        if (userInput.toUpperCase() === currentWord.original.toUpperCase()) {
            setScore(prev => {
                const next = prev + 100;
                scoreRef.current = next;
                return next;
            });
            setMessage('Correct! 🎉');
            setTimeout(() => {
                nextWord();
            }, 1000);
        } else {
            setMessage('Try again! ❌');
        }
    };

    const nextWord = () => {
        setMessage('');
        setUserInput('');
        if (currentIndex < words.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            finishGame();
        }
    };

    const finishGame = async () => {
        setIsGameOver(true);
        try {
            const res = await client.post('/api/games/score', {
                user_id: userId,
                game_name: 'scramble',
                score: scoreRef.current,
                duration_seconds: 60
            });
            setScoreResponse(res.data);
        } catch (err) { console.error("Failed to submit WordScramble score", err); }
    };

    const handleEndGame = () => {
        finishGame();
    };

    if (isLoading) return <div className="flex items-center justify-center h-[60vh] text-[#EAB308] font-bold animate-pulse">Loading Words...</div>;
    if (words.length === 0) return <div className="text-center p-10 font-bold text-gray-900">No words available. Upload some material!</div>;

    if (isGameOver) {
        return (
            <div className="card p-10 text-center space-y-6 max-w-md mx-auto animate-page-enter">
                <h2 className="text-3xl font-black text-gray-900">Game Over!</h2>
                <div className="text-5xl font-black text-[#EAB308]">{scoreRef.current}</div>
                <p className="text-gray-900 font-bold">Your knowledge is growing!</p>
                {scoreResponse && (
                    <div className="space-y-2 bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                        <p className="text-sm font-bold text-yellow-800">{scoreResponse.message}</p>
                        <div className="flex gap-4 justify-center text-xs font-bold uppercase tracking-wider text-yellow-700">
                            <span className="bg-yellow-100 px-3 py-1 rounded-full">High Score: {scoreResponse.new_high_score}</span>
                            <span className="bg-yellow-100 px-3 py-1 rounded-full">+{scoreResponse.xp_awarded} XP</span>
                        </div>
                    </div>
                )}
                <div className="flex gap-3 justify-center">
                    <button onClick={() => window.location.reload()} className="bg-[#EAB308] text-white py-3 px-6 rounded-xl font-bold">Play Again</button>
                    <button onClick={() => navigate('/games')} className="bg-gray-100 text-gray-900 py-3 px-6 rounded-xl font-bold">Back to Games</button>
                </div>
            </div>
        );
    }

    const current = words[currentIndex];

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-page-enter">
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/games')} className="p-2 hover:bg-gray-100 rounded-lg">🔙</button>
                    <h1 className="text-2xl font-black text-gray-900">Word Scramble</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-xl font-mono font-bold text-[#EAB308]">Score: {score}</div>
                    <button
                        onClick={handleEndGame}
                        className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-lg shadow-red-500/20 transition-all active:scale-95 uppercase tracking-wide"
                    >
                        🏁 End Game
                    </button>
                </div>
            </header>

            <div className="card p-8 bg-white border-2 border-[#EAB308]/20 flex flex-col items-center space-y-8">
                <div className="text-4xl font-black tracking-[10px] text-gray-900 uppercase animate-bounce">
                    {current.scrambled}
                </div>
                
                <div className="bg-gray-50 p-4 rounded-xl text-center border border-dashed border-gray-200">
                    <span className="text-[10px] font-bold text-gray-900 uppercase tracking-widest block mb-1">Context Clue</span>
                    <p className="text-[13px] font-medium text-gray-900">{current.hint}</p>
                </div>

                <div className="w-full space-y-4">
                    <input 
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
                        placeholder="Unscramble here..."
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-6 py-4 text-center text-xl font-bold text-gray-900 outline-none focus:border-[#EAB308] transition-all"
                    />
                    <button 
                        onClick={handleCheck}
                        className="w-full bg-[#EAB308] hover:bg-[#CA8A04] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-yellow-500/20 transition-all"
                    >
                        Submit Answer
                    </button>
                </div>

                {message && (
                    <div className={`text-sm font-bold ${message.includes('Correct') ? 'text-green-600' : 'text-red-600'} animate-pulse`}>
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WordScramble;
