import React, { useState, useEffect } from 'react';
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

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const res = await client.get(`/api/games/quiz-content/${userId}`);
                setQuestions(res.data);
            } catch (err) { console.error(err); }
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
        if (board[idx] || winner || pendingMove) return;
        
        // Show question barrier
        setPendingMove(idx);
        const q = questions[Math.floor(Math.random() * questions.length)];
        setCurrentQuestion(q);
    };

    const handleAnswer = (option) => {
        if (option === currentQuestion.correct_answer) {
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
            await client.post('/api/games/score', {
                user_id: userId,
                game_name: 'tictactoe',
                score: finalScore,
                duration_seconds: 120
            });
        } catch (err) { console.error(err); }
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

    return (
        <div className="max-w-xl mx-auto space-y-8 animate-page-enter">
            <header className="text-center">
                <h1 className="text-3xl font-black text-gray-800 uppercase tracking-tighter">TIC-TAC-TOE</h1>
                <p className="text-blue-500 font-bold text-xs uppercase tracking-widest mt-1">Answer to verify your move</p>
            </header>

            <div className="grid grid-cols-3 gap-3">
                {board.map((val, i) => (
                    <button 
                        key={i}
                        onClick={() => handleSquareClick(i)}
                        className={`aspect-square rounded-3xl text-4xl font-black flex items-center justify-center transition-all shadow-lg border-b-4 ${
                            val === 'X' ? 'bg-blue-500 text-white border-blue-700' : 
                            val === 'O' ? 'bg-red-500 text-white border-red-700' : 
                            'bg-gray-50 text-gray-400 hover:bg-gray-100 border-gray-200'
                        }`}
                    >
                        {val}
                    </button>
                ))}
            </div>

            {currentQuestion && (
                <div className="card p-6 border-2 border-blue-500 bg-blue-50 space-y-4 animate-[slideUp_0.3s]">
                    <h3 className="text-lg font-bold text-gray-800">{currentQuestion.question_text}</h3>
                    <div className="grid grid-cols-1 gap-2">
                        {currentQuestion.options.map((opt, i) => (
                            <button 
                                key={i}
                                onClick={() => handleAnswer(opt)}
                                className="w-full text-left p-3 rounded-xl bg-white border border-blue-200 hover:border-blue-500 font-bold transition-all"
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {winner && (
                <div className={`p-6 rounded-3xl text-center text-white font-black text-2xl shadow-xl ${winner === 'X' ? 'bg-green-500' : winner === 'O' ? 'bg-red-500' : 'bg-gray-500'}`}>
                    {winner === 'Draw' ? 'IT\'S A DRAW!' : `WINNER: ${winner === 'X' ? 'YOU' : 'AI BOT'}`}
                    <button onClick={() => window.location.reload()} className="block mx-auto mt-4 text-[10px] bg-white/20 px-4 py-2 rounded-full uppercase">Play Again</button>
                </div>
            )}
        </div>
    );
};

export default TicTacToe;
