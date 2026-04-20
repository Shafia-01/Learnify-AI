import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { submitAnswer as apiSubmitAnswer } from '../api/quiz';

const Quiz = () => {
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState('');
    const [feedback, setFeedback] = useState(null);
    const [loading, setLoading] = useState(true);
    const [score, setScore] = useState(0);
    const [totalXp, setTotalXp] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                // Using client.post as per spec for /api/quiz/generate
                const res = await client.post('/api/quiz/generate', {
                    topic: 'General',
                    level: localStorage.getItem('level') || 'Beginner'
                });
                if (res.data && res.data.questions) {
                    setQuestions(res.data.questions);
                } else {
                    // Fallback to mock for testing if API fails
                    setQuestions([
                        { id: '1', type: 'mcq', question: 'Which React hook is used for side effects?', options: ['useState', 'useContext', 'useEffect', 'useMemo'], difficulty: 'Medium' },
                        { id: '2', type: 'mcq', question: 'What is the default background color of this page?', options: ['Red', 'Lime Green', 'Blue', 'Purple'], difficulty: 'Easy' },
                        { id: '3', type: 'short', question: 'What does CSS stand for?', difficulty: 'Hard' }
                    ]);
                }
            } catch (err) {
                console.error("Quiz generation failed", err);
                // Fallback for demo
                setQuestions([
                    { id: '1', type: 'mcq', question: 'Which React hook is used for side effects?', options: ['useState', 'useContext', 'useEffect', 'useMemo'], difficulty: 'Medium' },
                    { id: '2', type: 'mcq', question: 'What is the default background color of this page?', options: ['Red', 'Lime Green', 'Blue', 'Purple'], difficulty: 'Easy' },
                    { id: '3', type: 'short', question: 'What does CSS stand for?', difficulty: 'Hard' }
                ]);
            } finally {
                setLoading(false);
            }
        };
        fetchQuestions();
    }, []);

    const handleSubmit = async () => {
        if (!selectedAnswer) return;
        const currentQ = questions[currentIndex];
        
        try {
            const res = await apiSubmitAnswer(currentQ.id, selectedAnswer);
            if (res) {
                setFeedback({
                    correct: res.is_correct,
                    explanation: res.explanation || (res.is_correct ? "Great job!" : "That's not quite right."),
                    xpEarned: res.xp_earned || (res.is_correct ? 50 : 0)
                });
                if (res.is_correct) {
                    setScore(s => s + 1);
                    setTotalXp(x => x + (res.xp_earned || 50));
                }
            }
        } catch (err) {
            // Local fallback logic
            const isCorrect = selectedAnswer.toLowerCase().includes('effect') || selectedAnswer.toLowerCase().includes('lime') || selectedAnswer.toLowerCase().includes('cascading');
            setFeedback({
                correct: isCorrect,
                explanation: isCorrect ? "Excellent explanation of the concept." : "Better luck next time!",
                xpEarned: isCorrect ? 50 : 0
            });
            if (isCorrect) {
                setScore(s => s + 1);
                setTotalXp(x => x + 50);
            }
        }
    };

    const handleNext = () => {
        setFeedback(null);
        setSelectedAnswer('');
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            setIsFinished(true);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-full space-y-4">
            <div className="w-12 h-12 border-4 border-[#84CC16] border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[#3a5c10] font-bold animate-pulse">Generating your personalized quiz...</p>
        </div>
    );

    if (isFinished) return (
        <div className="max-w-[680px] mx-auto text-center space-y-8 py-12 animate-page-enter">
            <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center animate-ping opacity-20">
                    <div className="w-48 h-48 bg-[#84CC16] rounded-full"></div>
                </div>
                <div className="relative z-10 w-32 h-32 bg-white rounded-full flex items-center justify-center mx-auto border-4 border-[#84CC16] shadow-xl">
                    <span className="text-5xl">🏆</span>
                </div>
            </div>

            <div className="card p-8 bg-white space-y-4">
                <h1 className="text-3xl font-black text-gray-800">Quiz Completed!</h1>
                <div className="flex justify-center gap-8 mt-4">
                    <div>
                        <div className="text-[11px] font-bold text-gray-400 uppercase">Score</div>
                        <div className="text-3xl font-black text-[#84CC16]">{score} / {questions.length}</div>
                    </div>
                    <div className="w-px bg-gray-100"></div>
                    <div>
                        <div className="text-[11px] font-bold text-gray-400 uppercase">XP Earned</div>
                        <div className="text-3xl font-black text-amber-500">+{totalXp}</div>
                    </div>
                </div>
                <button 
                    onClick={() => navigate('/dashboard')}
                    className="w-full mt-6 bg-[#84CC16] hover:bg-[#65a30d] text-white py-3 rounded-[12px] font-bold shadow-lg shadow-lime-500/20 transition-all"
                >
                    Back to Dashboard
                </button>
            </div>
        </div>
    );

    const currentQ = questions[currentIndex];
    const progress = ((currentIndex + 1) / questions.length) * 100;

    return (
        <div className="max-w-[680px] mx-auto space-y-6 pb-24 relative animate-page-enter">
            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="flex justify-end">
                    <div className="bg-[#ECFCCB] px-3 py-1 rounded-full text-[11px] font-bold text-[#1e2e0a]">
                        Question {currentIndex + 1} of {questions.length}
                    </div>
                </div>
                <div className="h-1 w-full bg-[#D9F99D] rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-[#84CC16] transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>

            {/* Metadata Row */}
            <div className="flex gap-2">
                <div className="bg-[#ECFCCB] px-3 py-1 rounded-full text-[11px] font-bold text-[#3a5c10] border border-[#bef264]">
                    Difficulty: {currentQ.difficulty || 'Medium'}
                </div>
                <div className="bg-[#FEF3C7] px-3 py-1 rounded-full text-[11px] font-bold text-[#854D0E] border border-[#fde68a]">
                    150 XP reward
                </div>
            </div>

            {/* Question Card */}
            <div className="card p-6 bg-white border-[0.5px] border-[#84CC16]/25">
                <h2 className="text-[15px] font-semibold text-gray-800 leading-relaxed">
                    {currentQ.question}
                </h2>
            </div>

            {/* Answer Options */}
            <div className="space-y-2.5">
                {currentQ.type === 'mcq' ? (
                    currentQ.options.map((option, i) => {
                        const isSelected = selectedAnswer === option;
                        return (
                            <button
                                key={i}
                                disabled={!!feedback}
                                onClick={() => setSelectedAnswer(option)}
                                className={`w-full text-left p-4 rounded-[8px] transition-all flex items-center gap-3 border ${
                                    isSelected 
                                        ? 'bg-[#ECFCCB] border-[#84CC16] border-[1.5px]' 
                                        : 'bg-white border-[#84CC16]/25 hover:border-[#84CC16]/50'
                                }`}
                            >
                                <div className={`w-3.5 h-3.5 rounded-full border-[1.5px] border-[#84CC16] flex items-center justify-center ${isSelected ? 'bg-white' : ''}`}>
                                    {isSelected && <div className="w-1.5 h-1.5 bg-[#84CC16] rounded-full"></div>}
                                </div>
                                <span className={`text-[14px] ${isSelected ? 'text-[#3a5c10] font-semibold' : 'text-gray-700'}`}>
                                    {option}
                                </span>
                            </button>
                        );
                    })
                ) : (
                    <textarea 
                        disabled={!!feedback}
                        value={selectedAnswer}
                        onChange={(e) => setSelectedAnswer(e.target.value)}
                        placeholder="Type your answer here..."
                        className="w-full h-32 p-4 bg-white border border-[#84CC16]/25 rounded-[8px] outline-none focus:border-[#84CC16]/60 text-[14px] leading-relaxed resize-none transition-all"
                    ></textarea>
                )}
            </div>

            {/* Actions */}
            {!feedback && (
                <div className="flex gap-3">
                    <button 
                        onClick={handleSubmit}
                        disabled={!selectedAnswer}
                        className="flex-1 bg-[#84CC16] hover:bg-[#65a30d] text-white py-3 rounded-[8px] font-bold shadow-lg shadow-lime-500/20 transition-all disabled:opacity-50"
                    >
                        Submit Answer
                    </button>
                    <button 
                        onClick={handleNext}
                        className="text-[#84CC16] font-bold px-6 hover:bg-[#84CC16]/5 rounded-[8px] transition-all"
                    >
                        Skip
                    </button>
                </div>
            )}

            {/* Feedback Overlay */}
            {feedback && (
                <div className="fixed bottom-0 left-0 right-0 p-6 flex justify-center z-50 animate-[slideUp_0.4s_ease-out]">
                    <div className={`w-full max-w-[680px] p-6 rounded-[16px] shadow-2xl border-t-4 ${
                        feedback.correct 
                            ? 'bg-[#ECFCCB] border-[#84CC16] text-[#3a5c10]' 
                            : 'bg-[#FEF2F2] border-[#EF4444] text-[#991B1B]'
                    }`}>
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-[18px] font-black uppercase tracking-tight">
                                {feedback.correct ? 'Correct!' : 'Incorrect'}
                            </h3>
                            {feedback.correct && (
                                <div className="text-[14px] font-bold animate-bounce">
                                    + {feedback.xpEarned} XP
                                </div>
                            )}
                        </div>
                        <p className="text-[13.5px] leading-relaxed mb-6 opacity-90 font-medium">
                            {feedback.explanation}
                        </p>
                        <button 
                            onClick={handleNext}
                            className={`w-full py-3 rounded-[10px] font-bold transition-all shadow-lg ${
                                feedback.correct 
                                    ? 'bg-[#84CC16] text-white shadow-lime-500/20' 
                                    : 'bg-[#EF4444] text-white shadow-red-500/20'
                            }`}
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default Quiz;
