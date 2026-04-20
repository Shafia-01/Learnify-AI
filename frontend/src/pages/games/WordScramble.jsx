import React, { useState, useEffect } from 'react';
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
            setScore(prev => prev + 100);
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
            await client.post('/api/games/score', {
                user_id: userId,
                game_name: 'scramble',
                score: score,
                duration_seconds: 60
            });
        } catch (err) { console.error("Failed to submit WordScramble score", err); }
    };

    if (isLoading) return <div className="flex items-center justify-center h-[60vh] text-[#EAB308] font-bold animate-pulse">Loading Words...</div>;
    if (words.length === 0) return <div>No words available. Upload some material!</div>;

    if (isGameOver) {
        return (
            <div className="card p-10 text-center space-y-6 max-w-md mx-auto animate-page-enter">
                <h2 className="text-3xl font-black text-gray-800">Game Over!</h2>
                <div className="text-5xl font-black text-[#EAB308]">{score}</div>
                <p className="text-gray-500">Your knowledge is growing!</p>
                <button onClick={() => navigate('/games')} className="w-full bg-[#EAB308] text-white py-3 rounded-xl font-bold">Back to Games</button>
            </div>
        );
    }

    const current = words[currentIndex];

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-page-enter">
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/games')} className="p-2 hover:bg-gray-100 rounded-lg">🔙</button>
                    <h1 className="text-2xl font-black text-gray-800">Word Scramble</h1>
                </div>
                <div className="text-xl font-mono font-bold text-[#EAB308]">Score: {score}</div>
            </header>

            <div className="card p-8 bg-white border-2 border-[#EAB308]/20 flex flex-col items-center space-y-8">
                <div className="text-4xl font-black tracking-[10px] text-gray-800 uppercase animate-bounce">
                    {current.scrambled}
                </div>
                
                <div className="bg-gray-50 p-4 rounded-xl text-center border border-dashed border-gray-200">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Context Clue</span>
                    <p className="text-[13px] font-medium text-gray-600">{current.hint}</p>
                </div>

                <div className="w-full space-y-4">
                    <input 
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Unscramble here..."
                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-6 py-4 text-center text-xl font-bold text-gray-800 outline-none focus:border-[#EAB308] transition-all"
                    />
                    <button 
                        onClick={handleCheck}
                        className="w-full bg-[#EAB308] hover:bg-[#CA8A04] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-yellow-500/20 transition-all"
                    >
                        Submit Answer
                    </button>
                </div>

                {message && (
                    <div className={`text-sm font-bold ${message.includes('Correct') ? 'text-green-500' : 'text-red-500'} animate-pulse`}>
                        {message}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WordScramble;
