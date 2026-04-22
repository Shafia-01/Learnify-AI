import { useState, useEffect, useRef } from 'react';
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

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const res = await client.get(`/api/games/quiz-content/${userId}`);
                setQuestions(res.data);
                if (res.data.length > 0) setCurrentQuestion(res.data[0]);
            } catch (err) { console.error("Failed to fetch quiz content for FallingQuiz", err); }
            finally { setIsLoading(false); }
        };
        fetchQuestions();
    }, [userId]);

    useEffect(() => {
        if (isGameOver || isLoading || !currentQuestion) return;

        const interval = setInterval(() => {
            setFallingItems(prev => {
                const newItems = prev.map(item => ({ ...item, y: item.y + 2 }))
                    .filter(item => item.y < 100);
                
                // Add new item if empty
                if (newItems.length < 3 && Math.random() < 0.1) {
                    const option = currentQuestion.options[Math.floor(Math.random() * currentQuestion.options.length)];
                    newItems.push({ 
                        id: Math.random(), 
                        x: Math.random() * 80 + 10, 
                        y: 0, 
                        text: option,
                        isCorrect: option?.toString().trim().toLowerCase() === currentQuestion.correct_answer?.toString().trim().toLowerCase()
                    });
                }

                // Collision detection
                newItems.forEach((item, index) => {
                    if (item.y > 85 && Math.abs(item.x - basketX) < 15) {
                        if (item.isCorrect) {
                            setScore(s => s + 100);
                            newItems.splice(index, 1);
                            // Next question
                            setQuestions(q => {
                                const nextIdx = (q.indexOf(currentQuestion) + 1) % q.length;
                                setCurrentQuestion(q[nextIdx]);
                                return q;
                            });
                        } else {
                            setIsGameOver(true);
                            submitScore();
                        }
                    }
                });

                return newItems;
            });
        }, 30);

        return () => clearInterval(interval);
    }, [isGameOver, isLoading, currentQuestion, basketX]);

    const submitScore = async () => {
        try {
            await client.post('/api/games/score', {
                user_id: userId,
                game_name: 'falling',
                score: score,
                duration_seconds: 45
            });
        } catch (err) { console.error("Failed to submit FallingQuiz score", err); }
    };

    const handleMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        setBasketX(Math.max(5, Math.min(95, x)));
    };

    if (isLoading) return <div className="text-center p-20 font-black animate-pulse text-[#EC4899]">PREPARING DROP ZONE...</div>;

    if (questions.length === 0) return (
        <div className="card p-10 text-center space-y-4 max-w-md mx-auto">
            <h2 className="text-2xl font-black text-gray-800">Sky is Clear</h2>
            <p className="text-gray-500 text-sm">But where are the questions? Upload your material to see them fall!</p>
            <button onClick={() => navigate('/upload')} className="w-full bg-[#EC4899] text-white py-3 rounded-xl font-bold font-black">Go to Upload</button>
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <header className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-pink-100">
                <div className="flex-1">
                    <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest">Active Question</span>
                    <h2 className="text-sm font-bold text-gray-800">{currentQuestion?.question_text}</h2>
                </div>
                <div className="text-2xl font-black text-[#EC4899] ml-4">{score}</div>
            </header>

            <div 
                onMouseMove={handleMove}
                className="relative h-[500px] bg-gradient-to-b from-slate-900 to-slate-800 rounded-3xl overflow-hidden cursor-none ring-8 ring-pink-500/10 shadow-2xl"
            >
                {fallingItems.map(item => (
                    <div 
                        key={item.id}
                        className="absolute bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full text-white text-[11px] font-bold whitespace-nowrap shadow-lg animate-[fadeIn_0.5s]"
                        style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translateX(-50%)' }}
                    >
                        {item.text}
                    </div>
                ))}

                <div 
                    className="absolute bottom-4 h-12 w-24 bg-pink-500 rounded-full flex items-center justify-center shadow-lg shadow-pink-500/40 transition-all border-4 border-white/20"
                    style={{ left: `${basketX}%`, transform: 'translateX(-50%)' }}
                >
                    <div className="text-white text-xl">🧺</div>
                </div>

                {isGameOver && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white space-y-4">
                        <div className="text-5xl font-black text-pink-500 mb-2">OOPS!</div>
                        <p className="text-xl font-bold">Wrong item caught!</p>
                        <button onClick={() => window.location.reload()} className="bg-pink-500 px-10 py-3 rounded-full font-black uppercase text-sm shadow-xl">Try Again</button>
                    </div>
                )}
            </div>
            
            <p className="text-center text-xs text-gray-400 font-bold uppercase tracking-wider">Catch the CORRECT answer with your basket. Don't catch the wrong ones!</p>
        </div>
    );
};

export default FallingQuiz;
