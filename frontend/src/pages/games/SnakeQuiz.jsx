import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const GRID_SIZE = 20;

const SnakeQuiz = () => {
    const navigate = useNavigate();
    const userId = localStorage.getItem('user_id') || 'default';
    const canvasRef = useRef(null);
    
    const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
    const [food, setFood] = useState({ x: 5, y: 5 });
    const [direction, setDirection] = useState({ x: 1, y: 0 });
    const [score, setScore] = useState(0);
    const [questions, setQuestions] = useState([]);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [isPaused, setIsPaused] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Ref to track current score without stale closure issues inside setInterval
    const scoreRef = useRef(0);

    const fetchQuestions = useCallback(async () => {
        try {
            const res = await client.get(`/api/games/quiz-content/${userId}`);
            setQuestions(res.data);
        } catch (err) { console.error(err); }
        finally { setIsLoading(false); }
    }, [userId]);

    const submitScore = useCallback(async () => {
        try {
            await client.post('/api/games/score', {
                user_id: userId,
                game_name: 'snake',
                // Use ref value to get the latest score, not the stale closure value
                score: scoreRef.current,
                duration_seconds: 60
            });
        } catch (err) { console.error("Score submission failed", err); }
    }, [userId]);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            switch (e.key) {
                case 'ArrowUp': if (direction.y === 0) setDirection({ x: 0, y: -1 }); break;
                case 'ArrowDown': if (direction.y === 0) setDirection({ x: 0, y: 1 }); break;
                case 'ArrowLeft': if (direction.x === 0) setDirection({ x: -1, y: 0 }); break;
                case 'ArrowRight': if (direction.x === 0) setDirection({ x: 1, y: 0 }); break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [direction]);

    useEffect(() => {
        if (isPaused || isGameOver || isLoading) return;

        const moveSnake = () => {
            const newHead = {
                x: (snake[0].x + direction.x + GRID_SIZE) % GRID_SIZE,
                y: (snake[0].y + direction.y + GRID_SIZE) % GRID_SIZE
            };

            if (snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
                setIsGameOver(true);
                submitScore();
                return;
            }

            const newSnake = [newHead, ...snake];

            if (newHead.x === food.x && newHead.y === food.y) {
                setIsPaused(true);
                const nextQ = questions[Math.floor(Math.random() * questions.length)];
                setCurrentQuestion(nextQ);
            } else {
                newSnake.pop();
                setSnake(newSnake);
            }
        };

        const interval = setInterval(moveSnake, 150);
        return () => clearInterval(interval);
    }, [snake, direction, food, isPaused, isGameOver, questions, isLoading]);

    const handleAnswer = (option) => {
        if (option === currentQuestion.correct_answer) {
            setScore(prev => {
                const next = prev + 500;
                scoreRef.current = next;
                return next;
            });
            setSnake(prev => [...prev, {}]);
            setFood({
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE)
            });
        } else {
            setScore(prev => {
                const next = Math.max(0, prev - 200);
                scoreRef.current = next;
                return next;
            });
        }
        setCurrentQuestion(null);
        setIsPaused(false);
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Snake
        ctx.fillStyle = '#EAB308';
        snake.forEach(seg => {
            ctx.fillRect(seg.x * 20, seg.y * 20, 18, 18);
        });

        // Draw Food
        ctx.fillStyle = '#FF4444';
        ctx.beginPath();
        ctx.arc(food.x * 20 + 10, food.y * 20 + 10, 8, 0, Math.PI * 2);
        ctx.fill();
    }, [snake, food]);

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <header className="flex justify-between items-center text-gray-800">
                <h1 className="text-xl font-black">SNAKE QUIZ</h1>
                <div className="font-mono font-bold bg-yellow-100 px-4 py-1 rounded-full text-yellow-700">Score: {score}</div>
            </header>

            <div className="relative bg-gray-900 rounded-2xl overflow-hidden border-8 border-gray-800 shadow-2xl aspect-square">
                <canvas ref={canvasRef} width={400} height={400} className="w-full h-full" />
                
                {currentQuestion && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 animate-page-enter">
                        <div className="bg-white rounded-3xl p-6 w-full space-y-6 shadow-2xl ring-4 ring-yellow-400">
                            <div className="text-center">
                                <span className="bg-yellow-100 text-yellow-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Knowledge Check</span>
                                <h3 className="text-lg font-bold text-gray-800 mt-2">{currentQuestion.question_text}</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {currentQuestion.options.map((opt, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => handleAnswer(opt)}
                                        className="w-full text-left p-4 rounded-xl border-2 border-gray-100 hover:border-yellow-400 hover:bg-yellow-50 transition-all font-bold text-sm"
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {isGameOver && (
                    <div className="absolute inset-0 bg-red-600/90 flex flex-col items-center justify-center text-white space-y-4">
                        <h2 className="text-4xl font-black">GAME OVER</h2>
                        <div className="text-xl">Final Score: {score}</div>
                        <button onClick={() => window.location.reload()} className="bg-white text-red-600 px-8 py-3 rounded-xl font-bold uppercase">Restart</button>
                        <button onClick={() => navigate('/games')} className="text-white/80 font-bold underline">Back to Selection</button>
                    </div>
                )}
            </div>
            
            <p className="text-center text-xs text-gray-400 font-bold uppercase tracking-widest">Use Arrow Keys to Move • Eat Red Food to Answer Questions</p>
        </div>
    );
};

export default SnakeQuiz;
