import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, getLeaderboard } from '../api/gamification';
import { getLearningPath } from '../api/query';
import client from '../api/client';

const Dashboard = () => {
    const navigate = useNavigate();
    const userId = localStorage.getItem('user_id') || 'default';
    
    const [profile, setProfile] = useState({ xp: 0, streak: 0, badges: 0 });
    const [stats, setStats] = useState({ quizAvg: 0, chunksIndexed: 0 });
    const [learningPath, setLearningPath] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [profileData, leaderboardData, pathData] = await Promise.all([
                    getProfile(),
                    getLeaderboard(),
                    getLearningPath(userId)
                ]);
                
                if (profileData) setProfile(profileData);
                if (leaderboardData) setLeaderboard(leaderboardData);
                if (pathData) setLearningPath(pathData);

                // Fetch extra stats manually if not in wrappers
                const statsResponse = await client.get(`/api/analytics/stats/${userId}`);
                if (statsResponse.data) setStats(statsResponse.data);
            } catch (err) {
                console.error("Failed to fetch dashboard data", err);
            }
        };
        fetchData();
    }, [userId]);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Hero Banner */}
            <section className="bg-[#2a2a2a] rounded-[12px] p-6 flex flex-col md:flex-row items-center justify-between text-white shadow-xl">
                <div className="space-y-4 max-w-xl">
                    <div className="space-y-1">
                        <h1 className="text-[17px] font-semibold leading-tight">Keep the momentum going!</h1>
                        <p className="text-[13px] text-white/80 leading-relaxed font-medium">
                            You're on a {profile.streak}-day streak. Complete today's quiz to unlock the Week Warrior badge.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => navigate('/quiz')}
                            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-6 py-2 rounded-full text-[13px] font-semibold shadow-lg shadow-purple-500/20 transition-all"
                        >
                            Start Quiz
                        </button>
                        <button 
                            onClick={() => navigate('/upload')}
                            className="bg-transparent hover:bg-white/5 text-white px-6 py-2 rounded-full text-[13px] font-semibold border border-white/40 transition-all"
                        >
                            Upload Material
                        </button>
                    </div>
                </div>
                
                <div className="flex gap-3 mt-6 md:mt-0">
                    <div className="bg-white/12 border border-white/10 px-5 py-3 rounded-[10px] text-center min-w-[110px]">
                        <div className="text-[18px] font-bold font-mono">{profile.xp.toLocaleString()}</div>
                        <div className="text-[10px] uppercase tracking-wider text-white/60 font-bold">XP Points</div>
                    </div>
                    <div className="bg-white/12 border border-white/10 px-5 py-3 rounded-[10px] text-center min-w-[110px]">
                        <div className="text-[18px] font-bold font-mono">{profile.streak} Days</div>
                        <div className="text-[10px] uppercase tracking-wider text-white/60 font-bold">Current Streak</div>
                    </div>
                </div>
            </section>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#FEF3C7] p-4 rounded-[8px] space-y-1 shadow-sm hover:shadow-md transition-all group border border-[#FDE68A]">
                    <span className="text-[11px] font-bold text-[#92400E]/60 uppercase tracking-tight">Total XP</span>
                    <div className="text-[22px] font-bold text-[#92400E] leading-none group-hover:scale-105 transition-transform origin-left">{profile.xp.toLocaleString()}</div>
                    <div className="text-[11px] font-semibold text-green-600">+50 today</div>
                </div>
                <div className="bg-[#D1FAE5] p-4 rounded-[8px] space-y-1 shadow-sm hover:shadow-md transition-all group border border-[#A7F3D0]">
                    <span className="text-[11px] font-bold text-[#065F46]/60 uppercase tracking-tight">Quiz Avg</span>
                    <div className="text-[22px] font-bold text-[#065F46] leading-none group-hover:scale-105 transition-transform origin-left">{stats.quizAvg}%</div>
                    <div className="text-[11px] font-semibold text-green-600">+6% this week</div>
                </div>
                <div className="bg-[#DBEAFE] p-4 rounded-[8px] space-y-1 shadow-sm hover:shadow-md transition-all group border border-[#BFDBFE]">
                    <span className="text-[11px] font-bold text-[#1E40AF]/60 uppercase tracking-tight">Chunks Indexed</span>
                    <div className="text-[22px] font-bold text-[#1E40AF] leading-none group-hover:scale-105 transition-transform origin-left">{stats.chunksIndexed}</div>
                    <div className="text-[11px] font-semibold text-[#1E40AF]/60">3 sources</div>
                </div>
                <div className="bg-[#EDE9FE] p-4 rounded-[8px] space-y-1 shadow-sm hover:shadow-md transition-all group border border-[#DDD6FE]">
                    <span className="text-[11px] font-bold text-[#5B21B6]/60 uppercase tracking-tight">Badges Earned</span>
                    <div className="text-[22px] font-bold text-[#5B21B6] leading-none group-hover:scale-105 transition-transform origin-left">{profile.badges}</div>
                    <div className="text-[11px] font-semibold text-amber-600">2 nearly unlocked</div>
                </div>
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Learning Path */}
                <div className="card p-6 flex flex-col h-full">
                    <h2 className="text-[15px] font-bold text-gray-800 mb-5">Your Learning Path</h2>
                    <div className="flex-1 space-y-5">
                        {learningPath.map((item, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <div 
                                        className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
                                        style={{ backgroundColor: `${item.color}15` }}
                                    >
                                        {item.emoji}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[13px] font-semibold text-gray-900 truncate">{item.name}</div>
                                        <div className="text-[11px] text-gray-500">{item.chunks} chunks mapped</div>
                                    </div>
                                </div>
                                <div className="h-[3px] w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full transition-all duration-1000 ease-out"
                                        style={{ width: `${item.progress}%`, backgroundColor: item.color }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-wider mb-3">Weekly Streak</h3>
                        <div className="flex justify-between items-center px-1">
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
                                const isDone = i < profile.streak % 7;
                                const isToday = i === (new Date().getDay() + 6) % 7;
                                return (
                                    <div key={i} className="flex flex-col items-center gap-1.5">
                                        <div 
                                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                                                isDone 
                                                    ? 'bg-[#7C3AED] text-white shadow-md' 
                                                    : isToday 
                                                        ? 'border border-[#DDD6FE] text-[#7C3AED]' 
                                                        : 'bg-gray-100 text-gray-400'
                                            }`}
                                        >
                                            {day}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Stack */}
                <div className="space-y-4">
                    {/* Leaderboard */}
                    <div className="card p-5 max-h-[280px] flex flex-col">
                        <h2 className="text-[14px] font-bold text-gray-800 mb-4">Top Scholars</h2>
                        <div className="space-y-2 overflow-y-auto pr-1">
                            {leaderboard.map((user, i) => (
                                <div 
                                    key={i} 
                                    className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                                        user.isMe ? 'bg-[#EDE9FE] text-[#5B21B6]' : 'hover:bg-gray-50'
                                    }`}
                                >
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                                        i === 0 ? 'bg-amber-100 text-amber-600' : 
                                        i === 1 ? 'bg-slate-100 text-slate-500' : 
                                        'bg-orange-100 text-orange-600'
                                    }`}>
                                        {i + 1}
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[12px] font-bold border border-white">
                                        {user.avatar}
                                    </div>
                                    <div className="flex-1 text-[13px] font-semibold">{user.isMe ? 'You' : user.name}</div>
                                    <div className="text-[12px] font-bold font-mono">
                                        {user.xp.toLocaleString()} <span className="text-[10px] opacity-50">XP</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Badges & Progress */}
                    <div className="card p-5 bg-white relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-[14px] font-bold text-gray-800">Your Badges</h2>
                            <div className="text-[11px] font-bold text-[#7C3AED] bg-[#EDE9FE] px-2 py-0.5 rounded-full">
                                {profile.badges} Total
                            </div>
                        </div>
                        <div className="flex gap-2 mb-6">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center border border-amber-200 shadow-sm" title="Top Performer">🥇</div>
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center border border-purple-200 shadow-sm" title="Week Warrior">⚡</div>
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center border border-emerald-200 shadow-sm" title="Fast Learner">🚀</div>
                            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-dashed border-gray-200 text-gray-300 text-xs font-bold">?</div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[11px] font-bold">
                                <span className="text-gray-500 uppercase tracking-wider">Level 5 Progress</span>
                                <span className="text-[#7C3AED] font-mono">{profile.xp} / 2,000 XP</span>
                            </div>
                            <div className="h-[6px] w-full bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-[#7C3AED] to-[#A855F7] transition-all duration-1000"
                                    style={{ width: `${(profile.xp / 2000) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
