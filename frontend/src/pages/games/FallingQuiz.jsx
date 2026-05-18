import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';

const FallingQuiz = () => {
    const navigate = useNavigate();
    const userId = localStorage.getItem('user_id') || 'default';
    
    const [questions, setQuestions] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [fallingItems, setFallingItems] = useState([]);
    const [score, setScore] = useState(0);
    const [basketX, setBasketX] = useState(50);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [scoreResponse, setScoreResponse] = useState(null);

    // Refs to avoid stale closures in setInterval
    const scoreRef = useRef(0);
    const optionIndexRef = useRef(0);
    const basketXRef = useRef(50);           // ← track basket position without re-creating interval
    const currentQuestionRef = useRef(null);
    const questionsRef = useRef([]);
    const isGameOverRef = useRef(false);

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const subject = localStorage.getItem('study_subject');
                const queryParams = subject ? `?subject=${encodeURIComponent(subject)}` : '';
                const res = await client.get(`/api/games/quiz-content/${userId}${queryParams}`);
                setQuestions(res.data);
                questionsRef.current = res.data;
                if (res.data.length > 0) {
                    setCurrentQuestion(res.data[0]);
                    currentQuestionRef.current = res.data[0];
                }
            } catch (err) { console.error("Failed to fetch quiz content for FallingQuiz", err); }
            finally { setIsLoading(false); }
        };
        fetchQuestions();
    }, [userId]);

    // Single game loop — no basketX in deps, uses refs instead
    useEffect(() => {
        if (isLoading || !currentQuestionRef.current) return;

        const interval = setInterval(() => {
            if (isGameOverRef.current) return;

            setFallingItems(prev => {
                const newItems = prev.map(item => ({ ...item, y: item.y + 0.5 }))
                    .filter(item => item.y < 105);

                // Only spawn if: max 1 on screen AND no item is near the top
                const canSpawn = newItems.length === 0 || 
                    (newItems.length < 2 && newItems.every(item => item.y > 35));

                if (canSpawn) {
                    const q = currentQuestionRef.current;
                    if (!q || !q.options) return newItems;
                    
                    const options = q.options;
                    const optIdx = optionIndexRef.current % options.length;
                    optionIndexRef.current += 1;
                    const option = options[optIdx];

                    // Place on opposite side from existing items
                    let x;
                    if (newItems.length === 0) {
                        x = Math.random() * 60 + 20;
                    } else {
                        const avgX = newItems.reduce((s, i) => s + i.x, 0) / newItems.length;
                        x = avgX > 50
                            ? Math.random() * 25 + 10
                            : Math.random() * 25 + 65;
                    }

                    newItems.push({
                        id: Date.now() + Math.random(),
                        x,
                        y: -5,
                        text: option,
                        isCorrect: option?.toString().trim().toLowerCase() === q.correct_answer?.toString().trim().toLowerCase()
                    });
                }

                // Collision detection using basketXRef (not stale state)
                const bx = basketXRef.current;
                const surviving = [];
                for (const item of newItems) {
                    if (item.y > 88 && Math.abs(item.x - bx) < 12) {
                        if (item.isCorrect) {
                            setScore(s => {
                                const next = s + 100;
                                scoreRef.current = next;
                                return next;
                            });
                            // Advance to next question
                            const qs = questionsRef.current;
                            const curIdx = qs.indexOf(currentQuestionRef.current);
                            const nextQ = qs[(curIdx + 1) % qs.length];
                            currentQuestionRef.current = nextQ;
                            setCurrentQuestion(nextQ);
                            optionIndexRef.current = 0;
                            continue; // item caught, don't keep it
                        } else {
                            isGameOverRef.current = true;
                            setIsGameOver(true);
                            submitScore();
                            return prev;
                        }
                    }
                    surviving.push(item);
                }

                return surviving;
            });
        }, 50);

        return () => clearInterval(interval);
    }, [isLoading]); // ← only depends on isLoading, NOT basketX

    const submitScore = async () => {
        try {
            const res = await client.post('/api/games/score', {
                user_id: userId,
                game_name: 'falling',
                score: scoreRef.current,
                duration_seconds: 45
            });
            setScoreResponse(res.data);
        } catch (err) { console.error("Failed to submit FallingQuiz score", err); }
    };

    const handleEndGame = () => {
        isGameOverRef.current = true;
        setIsGameOver(true);
        submitScore();
    };

    const handleMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const clamped = Math.max(5, Math.min(95, x));
        setBasketX(clamped);
        basketXRef.current = clamped; // ← update ref for the game loop
    };

    if (isLoading) return <div className="text-center p-20 font-black animate-pulse text-[#EC4899]">PREPARING DROP ZONE...</div>;

    if (questions.length === 0) return (
        <div className="card p-10 text-center space-y-4 max-w-md mx-auto">
            <h2 className="text-2xl font-black text-gray-900">Sky is Clear</h2>
            <p className="text-gray-900 text-sm">But where are the questions? Upload your material to see them fall!</p>
            <button onClick={() => navigate('/upload')} className="w-full bg-[#EC4899] text-white py-3 rounded-xl font-bold font-black">Go to Upload</button>
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <header className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-pink-100">
                <div className="flex-1">
                    <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest">Active Question</span>
                    <h2 className="text-sm font-bold text-gray-900">{currentQuestion?.question_text}</h2>
                </div>
                <div className="text-2xl font-black text-[#EC4899] ml-4">{score}</div>
                {!isGameOver && (
                    <button
                        onClick={handleEndGame}
                        className="ml-4 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-lg shadow-red-500/20 transition-all active:scale-95 uppercase tracking-wide"
                    >
                        🏁 End Game
                    </button>
                )}
            </header>

            <div 
                onMouseMove={handleMove}
                className="relative h-[500px] bg-gradient-to-b from-slate-900 to-slate-800 rounded-3xl overflow-hidden cursor-none ring-8 ring-pink-500/10 shadow-2xl"
            >
                {fallingItems.map(item => (
                    <div 
                        key={item.id}
                        className="absolute px-6 py-3 rounded-xl text-white text-sm font-bold whitespace-nowrap shadow-lg"
                        style={{ 
                            left: `${item.x}%`, 
                            top: `${item.y}%`, 
                            transform: 'translateX(-50%)',
                            minWidth: '100px',
                            textAlign: 'center',
                            background: 'rgba(255,255,255,0.15)',
                            border: '1px solid rgba(255,255,255,0.3)',
                            backdropFilter: 'blur(8px)',
                        }}
                    >
                        {item.text}
                    </div>
                ))}

                <div 
                    className="absolute bottom-4 h-14 w-20 bg-pink-500 rounded-full flex items-center justify-center shadow-lg shadow-pink-500/40 border-4 border-white/30"
                    style={{ left: `${basketX}%`, transform: 'translateX(-50%)' }}
                >
                    <div className="text-white text-2xl">🧺</div>
                </div>

                {isGameOver && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white space-y-4 z-10">
                        <div className="text-5xl font-black text-pink-500 mb-2">GAME OVER</div>
                        <div className="text-3xl font-black">{scoreRef.current} pts</div>
                        {scoreResponse && (
                            <div className="space-y-2 text-center">
                                <p className="text-sm font-bold text-pink-300">{scoreResponse.message}</p>
                                <div className="flex gap-4 justify-center text-xs font-bold uppercase tracking-wider">
                                    <span className="bg-white/20 px-3 py-1 rounded-full">High Score: {scoreResponse.new_high_score}</span>
                                    <span className="bg-white/20 px-3 py-1 rounded-full">+{scoreResponse.xp_awarded} XP</span>
                                </div>
                            </div>
                        )}
                        <div className="flex gap-3 mt-2">
                            <button onClick={() => window.location.reload()} className="bg-pink-500 px-10 py-3 rounded-full font-black uppercase text-sm shadow-xl">Try Again</button>
                            <button onClick={() => navigate('/games')} className="bg-white/10 border border-white/20 px-8 py-3 rounded-full font-bold text-sm">Back to Games</button>
                        </div>
                    </div>
                )}
            </div>
            
            <p className="text-center text-xs text-gray-900 font-bold uppercase tracking-wider">Catch the CORRECT answer with your basket. Don't catch the wrong ones!</p>
        </div>
    );
};

export default FallingQuiz;
