import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { getDocuments } from '../api/documents';
import Avatar from '../components/Avatar';

const games = [
    { id: 'snake', name: 'Snake Quiz', tagline: 'Answer questions to keep growing!', color: '#EAB308', icon: '🐍' },
    { id: 'tictactoe', name: 'Tic-Tac-Toe', tagline: 'vs AI bot', color: '#EAB308', icon: '❌', featured: true },
    { id: 'memory', name: 'Memory Match', tagline: 'Flip and match pairs', color: '#10B981', icon: '🧠' },
    { id: 'scramble', name: 'Word Scramble', tagline: 'Unscramble topic words', color: '#3B82F6', icon: '🔠' },
    { id: 'falling', name: 'Falling Quiz', tagline: 'Catch the right answer', color: '#EC4899', icon: '🌠' },
    { id: 'flashcard', name: 'Flashcard Flip', tagline: 'Flip and memorize', color: '#8B5CF6', icon: '🗂️' },
];

const Games = () => {
    const navigate = useNavigate();
    const userId = localStorage.getItem('user_id') || 'default';
    const [selectedGame, setSelectedGame] = useState('snake');
    const [leaderboard, setLeaderboard] = useState([]);
    const [highScores, setHighScores] = useState({});
    const [library, setLibrary] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(localStorage.getItem('study_subject') || "");

    useEffect(() => {
        getDocuments().then(data => setLibrary(data)).catch(console.error);
    }, []);

    const handleSubjectChange = (e) => {
        setSelectedSubject(e.target.value);
        if (e.target.value) {
            localStorage.setItem('study_subject', e.target.value);
        } else {
            localStorage.removeItem('study_subject');
        }
    };

    useEffect(() => {
        const fetchScores = async () => {
            try {
                const res = await client.get(`/api/games/scores/${userId}`);
                // Backend returns { user_id, scores: { snake: 0, ... }, total_games_played }
                if (res.data?.scores) setHighScores(res.data.scores);
                else if (res.data) setHighScores(res.data);
            } catch (err) { console.error("Failed to fetch high scores", err); }
        };
        fetchScores();
    }, [userId]);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await client.get(`/api/games/leaderboard/${selectedGame}`);
                if (res.data) setLeaderboard(res.data);
            } catch (err) { 
                console.error("Failed to fetch leaderboard", err);
                // Mock for UI
                setLeaderboard([
                    { rank: 1, avatar: '👤', name: 'Alex Major', score: 1250 },
                    { rank: 2, avatar: '👤', name: 'Sarah C.', score: 1100 },
                    { rank: 3, avatar: '👤', name: 'You', score: highScores[selectedGame] || 850, isMe: true },
                    { rank: 4, avatar: '👤', name: 'David W.', score: 720 },
                    { rank: 5, avatar: '👤', name: 'Priya K.', score: 680 },
                ]);
            }
        };
        fetchLeaderboard();
    }, [selectedGame, highScores]);

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-page-enter">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-[18px] font-bold text-gray-900">Choose a Mini-Game</h1>
                <div className="flex items-center gap-3">
                    <label className="text-[13px] font-bold text-gray-700">Study Subject:</label>
                    <select 
                        value={selectedSubject} 
                        onChange={handleSubjectChange}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-[13px] font-semibold text-gray-900 focus:outline-none focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308]"
                    >
                        <option value="">All Uploads (Mixed)</option>
                        {library.map(s => (
                            <option key={s.subject} value={s.subject}>{s.subject}</option>
                        ))}
                    </select>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {games.map((game) => (
                    <div 
                        key={game.id}
                        onClick={() => navigate(`/games/${game.id}`)}
                        className="relative group p-4 flex flex-col items-center text-center cursor-pointer hover:translate-y-[-4px] transition-all duration-300 border-t-[3px] overflow-hidden rounded-xl bg-gray-900 shadow-md hover:shadow-lg border border-gray-800"
                        style={{ borderTopColor: game.color }}
                    >
                        {game.featured && (
                            <div className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse">
                                HOT
                            </div>
                        )}
                        
                        <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shadow-sm mb-3"
                            style={{ backgroundColor: `${game.color}20` }}
                        >
                            {game.icon}
                        </div>

                        <h3 className="text-[13px] font-bold mb-1 text-white">{game.name}</h3>
                        <p className="text-[11px] mb-3 text-white/80">
                            {game.tagline}
                        </p>

                        <div 
                            className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                            style={{ backgroundColor: `${game.color}15`, color: game.color }}
                        >
                            High Score: {highScores[game.id] || 0}
                        </div>
                    </div>
                ))}
            </div>

            {/* Leaderboard Section */}
            <div className="card p-6 bg-white space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-[15px] font-bold text-gray-900">Game Leaderboard</h2>
                    <div className="flex bg-gray-50 p-1 rounded-lg gap-1 border border-gray-100 overflow-x-auto no-scrollbar">
                        {games.map((game) => (
                            <button
                                key={game.id}
                                onClick={() => setSelectedGame(game.id)}
                                className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all whitespace-nowrap ${
                                    selectedGame === game.id 
                                        ? 'bg-[#EAB308] text-white shadow-sm' 
                                        : 'text-gray-900 hover:text-gray-900'
                                }`}
                            >
                                {game.name.split(' ')[0]}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    {leaderboard.map((row, i) => (
                        <div 
                            key={i}
                            className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                                row.isMe ? 'bg-[#FEF9C3] ring-1 ring-[#EAB308]/20' : 'hover:bg-gray-50'
                            }`}
                        >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                                i === 0 ? 'bg-amber-100 text-amber-600' : 'text-gray-900'
                            }`}>
                                {row.rank}
                            </div>
                            <Avatar name={row.isMe ? (localStorage.getItem('name') || "You") : row.name} size="sm" />
                            <div className="flex-1 text-[13px] font-bold text-gray-900">
                                {row.isMe ? 'You (Keep climbing!)' : row.name}
                            </div>
                            <div className="text-[13px] font-black font-mono text-[#EAB308]">
                                {row.score.toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Games;
