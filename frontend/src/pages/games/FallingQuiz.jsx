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
    const [caught, setCaught] = useState(null); // feedback flash

    // Refs to avoid stale closures in setInterval
    const scoreRef = useRef(0);
    const basketXRef = useRef(50);
    const currentQuestionRef = useRef(null);
    const questionsRef = useRef([]);
    const questionIndexRef = useRef(0);
    const isGameOverRef = useRef(false);
    const fallingItemsRef = useRef([]); // keep a ref for the current items so we can build non-overlapping spawns

    // ─── helpers ─────────────────────────────────────────────────────────────

    const shuffleArray = (arr) => {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };

    /** Guaranteed options for a question: at least 3 including the correct answer */
    const buildOptions = (q) => {
        if (!q) return [];
        const rawOpts = Array.isArray(q.options) ? [...q.options] : [];

        // Ensure correct answer is present
        const correct = (q.correct_answer || '').trim();
        const alreadyHasCorrect = rawOpts.some(o =>
            o.toString().trim().toLowerCase() === correct.toLowerCase()
        );
        if (correct && !alreadyHasCorrect) rawOpts.push(correct);

        // Need at least 3 options
        const fakes = ['True', 'False', 'None of the above', 'All of the above', 'Not given'];
        let pool = shuffleArray(rawOpts);
        while (pool.length < 3) {
            const candidate = fakes.find(f => !pool.includes(f)) || `Option ${pool.length + 1}`;
            pool.push(candidate);
        }

        return shuffleArray(pool);
    };

    const isCorrectAnswer = (option, q) => {
        if (!option || !q?.correct_answer) return false;
        const opt = option.toString().trim().toLowerCase();
        const ans = q.correct_answer.toString().trim().toLowerCase();
        if (opt === ans) return true;
        const strip = s => s.replace(/^[a-d0-9][\.)\-\s]+/i, '').trim();
        if (strip(opt) === strip(ans)) return true;
        if (opt.includes(ans) || ans.includes(opt)) return true;
        return false;
    };

    // ─── fetch questions ──────────────────────────────────────────────────────

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const subject = localStorage.getItem('study_subject');
                const queryParams = subject ? `?subject=${encodeURIComponent(subject)}` : '';
                const res = await client.get(`/api/games/quiz-content/${userId}${queryParams}`);
                const qs = res.data || [];
                setQuestions(qs);
                questionsRef.current = qs;
                if (qs.length > 0) {
                    setCurrentQuestion(qs[0]);
                    currentQuestionRef.current = qs[0];
                }
            } catch (err) { console.error('FallingQuiz: fetch failed', err); }
            finally { setIsLoading(false); }
        };
        fetchQuestions();
    }, [userId]);

    // ─── initialise falling items whenever question changes ───────────────────

    useEffect(() => {
        if (!currentQuestion) return;
        const opts = buildOptions(currentQuestion);
        // Spread options evenly across the arena width (10-90%)
        const count = Math.max(3, opts.length);
        const chosen = opts.slice(0, count);
        const items = chosen.map((text, idx) => ({
            id: Date.now() + idx,
            text,
            isCorrect: isCorrectAnswer(text, currentQuestion),
            // stagger starting y and x positions so they don't all arrive at once
            x: 10 + (idx / (count - 1 || 1)) * 80, // spread from 10% to 90%
            y: -10 - idx * 20,                       // staggered start heights
            speed: 0.35 + Math.random() * 0.15,      // slight speed variance
        }));
        setFallingItems(items);
        fallingItemsRef.current = items;
    }, [currentQuestion]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── game loop ────────────────────────────────────────────────────────────
    // All side effects (score, caught, question advance) are done OUTSIDE
    // the setFallingItems updater to avoid React 18 Strict Mode double-firing.

    useEffect(() => {
        if (isLoading || !currentQuestionRef.current) return;

        const interval = setInterval(() => {
            if (isGameOverRef.current) return;

            const q = currentQuestionRef.current;
            if (!q) return;

            // Read current items from ref
            const prev = fallingItemsRef.current;

            // Move items down; loop back to top if they fall off
            let updated = prev.map(item => {
                let newY = item.y + item.speed;
                if (newY > 108) {
                    newY = -8 - Math.random() * 20;
                    return { ...item, y: newY, x: 10 + Math.random() * 80 };
                }
                return { ...item, y: newY };
            });

            // Ensure at least 3 options are always on screen
            if (updated.length < 3) {
                const opts = buildOptions(q);
                const needed = 3 - updated.length;
                const extra = opts.slice(0, needed).map((text, idx) => ({
                    id: Date.now() + idx + 9999,
                    text,
                    isCorrect: isCorrectAnswer(text, q),
                    x: 10 + Math.random() * 80,
                    y: -10 - idx * 25,
                    speed: 0.35 + Math.random() * 0.15,
                }));
                updated = [...updated, ...extra];
            }

            // Collision detection
            const bx = basketXRef.current;
            const remaining = [];
            let correctCaught = false;
            let wrongCaught = false;

            for (const item of updated) {
                const inBasket = item.y > 88 && item.y < 100 && Math.abs(item.x - bx) < 12;
                if (inBasket) {
                    if (item.isCorrect) {
                        correctCaught = true;
                        // Don't push to remaining — consume it
                    } else {
                        wrongCaught = true;
                        // Loop this wrong item back to top instead of removing it
                        remaining.push({ ...item, y: -10 - Math.random() * 20, x: 10 + Math.random() * 80 });
                    }
                } else {
                    remaining.push(item);
                }
            }

            // ── Apply side effects OUTSIDE the updater ──
            if (correctCaught) {
                // Update score: +500
                const newScore = scoreRef.current + 500;
                scoreRef.current = newScore;
                setScore(newScore);
                setCaught({ type: 'correct', text: '✅' });
                setTimeout(() => setCaught(null), 800);

                // Move to next question — loop back to start if all answered
                const qs = questionsRef.current;
                let nextIdx = questionIndexRef.current + 1;
                if (nextIdx >= qs.length) {
                    nextIdx = 0;
                }
                questionIndexRef.current = nextIdx;
                const nextQ = qs[nextIdx];
                currentQuestionRef.current = nextQ;
                setCurrentQuestion(nextQ);

                // Clear items — useEffect will reinit for new question
                fallingItemsRef.current = [];
                setFallingItems([]);
            } else if (wrongCaught) {
                // Update score: -200
                const newScore = Math.max(0, scoreRef.current - 200);
                scoreRef.current = newScore;
                setScore(newScore);
                setCaught({ type: 'wrong', text: '❌' });
                setTimeout(() => setCaught(null), 800);

                fallingItemsRef.current = remaining;
                setFallingItems(remaining);
            } else {
                // No collision — just update positions
                fallingItemsRef.current = updated;
                setFallingItems(updated);
            }
        }, 50);

        return () => clearInterval(interval);
    }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── keyboard controls ────────────────────────────────────────────────────

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (isGameOverRef.current || isLoading) return;
            if (e.key === 'ArrowLeft') {
                setBasketX(prev => { const n = Math.max(5, prev - 5); basketXRef.current = n; return n; });
            } else if (e.key === 'ArrowRight') {
                setBasketX(prev => { const n = Math.min(95, prev + 5); basketXRef.current = n; return n; });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isLoading]);

    // ─── submit score ─────────────────────────────────────────────────────────

    const submitScore = async () => {
        try {
            const res = await client.post('/api/games/score', {
                user_id: userId,
                game_name: 'falling',
                score: scoreRef.current,
                duration_seconds: 60
            });
            setScoreResponse(res.data);
        } catch (err) { console.error('FallingQuiz: score submit failed', err); }
    };

    const handleEndGame = () => {
        isGameOverRef.current = true;
        setIsGameOver(true);
        submitScore();
    };

    const handleMouseMove = (e) => {
        if (isGameOver) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const clamped = Math.max(8, Math.min(92, x));
        setBasketX(clamped);
        basketXRef.current = clamped;
    };

    // ─── render ───────────────────────────────────────────────────────────────

    if (isLoading) return (
        <div className="text-center p-20 font-black animate-pulse text-[#EC4899] uppercase">
            Preparing Drop Zone...
        </div>
    );

    if (questions.length === 0) return (
        <div className="card p-10 text-center space-y-4 max-w-md mx-auto">
            <h2 className="text-2xl font-black text-gray-900">Sky is Clear</h2>
            <p className="text-gray-600 text-sm">No questions found! Upload your material to see them fall.</p>
            <button onClick={() => navigate('/upload')} className="w-full bg-[#EC4899] text-white py-3 rounded-xl font-bold">
                Go to Upload
            </button>
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <header className="bg-white p-4 rounded-2xl shadow-sm border border-pink-100 space-y-2">
                <div className="flex justify-between items-center gap-3">
                    <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest flex-shrink-0">Active Question</span>
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-2xl font-black text-[#EC4899]">{score} pts</div>
                        {!isGameOver && (
                            <button
                                onClick={handleEndGame}
                                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95 uppercase tracking-wide"
                            >
                                🏁 End Game
                            </button>
                        )}
                    </div>
                </div>
                <h2 className="text-sm font-bold text-gray-900 leading-snug">{currentQuestion?.question_text}</h2>
            </header>

            {/* Arena */}
            <div
                onMouseMove={handleMouseMove}
                className={`relative h-[520px] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 rounded-3xl overflow-hidden ring-4 ring-pink-500/20 shadow-2xl ${isGameOver ? 'cursor-default' : 'cursor-none'}`}
            >
                {/* Stars / ambiance */}
                <div className="absolute inset-0 pointer-events-none">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 rounded-full bg-white/30"
                            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 60}%`, animationDelay: `${i * 0.3}s` }}
                        />
                    ))}
                </div>

                {/* Catch feedback banner */}
                {caught && (
                    <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-20 px-6 py-2 rounded-full font-black text-sm shadow-xl transition-all ${caught.type === 'correct' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                        {caught.type === 'correct' ? `✅ +500 Correct!` : `❌ -200 Wrong!`}
                    </div>
                )}

                {/* Falling answer options */}
                {fallingItems.map(item => (
                    <div
                        key={item.id}
                        className="absolute px-4 py-2 rounded-xl text-white text-xs font-bold shadow-lg select-none"
                        style={{
                            left: `${item.x}%`,
                            top: `${item.y}%`,
                            transform: 'translateX(-50%)',
                            minWidth: '120px',
                            maxWidth: '260px',
                            textAlign: 'center',
                            background: 'rgba(255,255,255,0.18)',
                            border: '1px solid rgba(255,255,255,0.35)',
                            backdropFilter: 'blur(6px)',
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            lineHeight: '1.4',
                        }}
                    >
                        {item.text}
                    </div>
                ))}

                {/* Basket */}
                <div
                    className="absolute bottom-4 h-14 w-24 bg-gradient-to-b from-pink-400 to-pink-600 rounded-full flex items-center justify-center shadow-lg shadow-pink-500/50 border-4 border-white/30 transition-none"
                    style={{ left: `${basketX}%`, transform: 'translateX(-50%)' }}
                >
                    <div className="text-white text-2xl">🧺</div>
                </div>

                {/* Game Over overlay */}
                {isGameOver && (
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center text-white space-y-4 z-10">
                        <div className="text-5xl font-black text-pink-400 mb-2">GAME OVER</div>
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
                            <button onClick={() => window.location.reload()} className="bg-pink-500 px-10 py-3 rounded-full font-black uppercase text-sm shadow-xl">
                                Try Again
                            </button>
                            <button onClick={() => navigate('/games')} className="bg-white/10 border border-white/20 px-8 py-3 rounded-full font-bold text-sm">
                                Back to Games
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Hint */}
            <p className="text-center text-xs text-gray-700 font-bold uppercase tracking-wider">
                🖱️ Move Mouse or ← → Arrow Keys • Catch the CORRECT Answer • Wrong = -200pts
            </p>
        </div>
    );
};

export default FallingQuiz;
