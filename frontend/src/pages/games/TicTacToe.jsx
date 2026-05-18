import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';

const TicTacToe = () => {
    const navigate = useNavigate();
    const userId = localStorage.getItem('user_id') || 'default';
    
    const [board, setBoard] = useState(Array(9).fill(null));
    const [isXNext, setIsXNext] = useState(true);
    const [questions, setQuestions] = useState([]);
    const [pendingMove, setPendingMove] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [winner, setWinner] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEnded, setIsEnded] = useState(false);
    const [scoreResponse, setScoreResponse] = useState(null);

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const subject = localStorage.getItem('study_subject');
                const queryParams = subject ? `?subject=${encodeURIComponent(subject)}` : '';
                const res = await client.get(`/api/games/quiz-content/${userId}${queryParams}`);
                setQuestions(res.data);
            } catch (err) { console.error("Failed to fetch quiz content for TicTacToe", err); }
            finally { setIsLoading(false); }
        };
        fetchQuestions();
    }, [userId]);

    const calculateWinner = (squares) => {
        const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
        for (let i = 0; i < lines.length; i++) {
            const [a, b, c] = lines[i];
            if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a];
        }
        return squares.every(s => s) ? 'Draw' : null;
    };

    const handleSquareClick = (idx) => {
        if (board[idx] || winner || pendingMove || isEnded) return;
        
        // Show question barrier
        setPendingMove(idx);
        const q = questions[Math.floor(Math.random() * questions.length)];
        setCurrentQuestion(q);
    };

    const handleAnswer = (option) => {
        const isCorrect = option?.toString().trim().toLowerCase() === currentQuestion.correct_answer?.toString().trim().toLowerCase();
        if (isCorrect) {
            const newBoard = [...board];
            newBoard[pendingMove] = 'X';
            setBoard(newBoard);
            const win = calculateWinner(newBoard);
            if (win) {
                setWinner(win);
                submitScore(win === 'X' ? 1000 : 200);
            } else {
                // AI Move
                setTimeout(() => aiMove(newBoard), 500);
            }
        } else {
            alert("Wrong answer! Move denied.");
        }
        setPendingMove(null);
        setCurrentQuestion(null);
    };

    const submitScore = async (finalScore) => {
        try {
            const res = await client.post('/api/games/score', {
                user_id: userId,
                game_name: 'tictactoe',
                score: finalScore,
                duration_seconds: 120
            });
            setScoreResponse(res.data);
        } catch (err) { console.error("Failed to submit TicTacToe score", err); }
    };

    const handleEndGame = () => {
        setIsEnded(true);
        // Calculate score based on board state: X-marks * 100
        const xCount = board.filter(s => s === 'X').length;
        const finalScore = xCount * 100;
        submitScore(finalScore);
    };

    const aiMove = (currentBoard) => {
        const available = currentBoard.map((s, i) => s === null ? i : null).filter(val => val !== null);
        if (available.length === 0) return;
        
        const move = available[Math.floor(Math.random() * available.length)];
        const newBoard = [...currentBoard];
        newBoard[move] = 'O';
        setBoard(newBoard);
        const win = calculateWinner(newBoard);
        if (win) {
            setWinner(win);
            submitScore(win === 'X' ? 1000 : win === 'O' ? 100 : 300);
        }
    };

    if (isLoading) return <div className="text-center p-20 font-black animate-pulse text-blue-500">SETTING UP BOARD...</div>;
    
    if (questions.length === 0) return (
        <div className="card p-10 text-center space-y-4 max-w-md mx-auto">
            <h2 className="text-2xl font-black text-gray-900">No content available</h2>
            <p className="text-gray-900">Please upload some documents in the Upload section to generate questions for this game.</p>
            <button onClick={() => navigate('/upload')} className="w-full bg-blue-500 text-white py-3 rounded-xl font-bold">Go to Upload</button>
        </div>
    );

    const gameFinished = winner || isEnded;

    return (
        <div className="max-w-xl mx-auto space-y-8 animate-page-enter">
            <header className="text-center space-y-2">
                <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">TIC-TAC-TOE</h1>
                <p className="text-blue-600 font-bold text-xs uppercase tracking-widest mt-1">Answer to verify your move</p>
                {!gameFinished && (
                    <button
                        onClick={handleEndGame}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full font-bold text-sm shadow-lg shadow-red-500/20 transition-all active:scale-95 uppercase tracking-wide"
                    >
                        🏁 End Game
                    </button>
                )}
            </header>

            <div className="grid grid-cols-3 gap-3">
                {board.map((val, i) => (
                    <button 
                        key={i}
                        onClick={() => handleSquareClick(i)}
                        className={`aspect-square rounded-3xl text-4xl font-black flex items-center justify-center transition-all shadow-lg border-b-4 ${
                            val === 'X' ? 'bg-blue-500 text-white border-blue-700' : 
                            val === 'O' ? 'bg-red-500 text-white border-red-700' : 
                            'bg-gray-50 text-gray-900 hover:bg-gray-100 border-gray-200'
                        }`}
                    >
                        {val}
                    </button>
                ))}
            </div>

            {currentQuestion && (
                <div className="card p-6 border-2 border-blue-500 bg-blue-50 space-y-4 animate-[slideUp_0.3s]">
                    <h3 className="text-lg font-bold text-gray-900">{currentQuestion.question_text}</h3>
                    <div className="grid grid-cols-1 gap-2">
                        {currentQuestion.options.map((opt, i) => (
                            <button 
                                key={i}
                                onClick={() => handleAnswer(opt)}
                                className="w-full text-left p-3 rounded-xl bg-white border border-blue-200 hover:border-blue-500 font-bold transition-all text-gray-900"
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {gameFinished && (
                <div className={`p-8 rounded-3xl text-center text-white font-black space-y-4 shadow-xl ${
                    winner === 'X' ? 'bg-green-500' : 
                    winner === 'O' ? 'bg-red-500' : 
                    isEnded ? 'bg-blue-600' :
                    'bg-gray-500'
                }`}>
                    <div className="text-2xl">
                        {winner === 'Draw' ? "IT'S A DRAW!" : 
                         winner === 'X' ? 'WINNER: YOU 🏆' :
                         winner === 'O' ? 'WINNER: AI BOT' :
                         'GAME ENDED'}
                    </div>
                    {scoreResponse && (
                        <div className="space-y-2">
                            <p className="text-sm font-bold opacity-90">{scoreResponse.message}</p>
                            <div className="flex gap-4 justify-center text-xs font-bold uppercase tracking-wider">
                                <span className="bg-white/10 px-3 py-1 rounded-full">Score: {scoreResponse.submitted_score}</span>
                                <span className="bg-white/10 px-3 py-1 rounded-full">High: {scoreResponse.new_high_score}</span>
                                <span className="bg-white/10 px-3 py-1 rounded-full">+{scoreResponse.xp_awarded} XP</span>
                            </div>
                        </div>
                    )}
                    <div className="flex gap-3 justify-center mt-2">
                        <button onClick={() => window.location.reload()} className="bg-white/20 px-6 py-2 rounded-full uppercase text-sm font-bold">Play Again</button>
                        <button onClick={() => navigate('/games')} className="bg-white/10 border border-white/20 px-6 py-2 rounded-full text-sm font-bold">Back to Games</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TicTacToe;
