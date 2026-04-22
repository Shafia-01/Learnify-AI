import { useState, useEffect } from 'react';
import { getSessionStats } from '../api/analytics';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';

const AnalyticsPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const userId = localStorage.getItem('user_id') || 'default';

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const stats = await getSessionStats(userId);
                setData(stats);
            } catch (err) {
                console.error("Failed to fetch analytics", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [userId]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    const formatMinutes = (mins) => {
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        const rem = Math.round(mins % 60);
        return `${hrs}h ${rem}m`;
    };

    const stats = [
        { label: 'Study Time', value: formatMinutes(data?.total_time_spent_minutes || 0), trend: '+12%', color: '#6366F1' },
        { label: 'Avg Accuracy', value: `${data?.avg_quiz_score || 0}%`, trend: '+5%', color: '#10B981' },
        { label: 'Topics', value: data?.topics_covered || 0, trend: '+2', color: '#F59E0B' },
        { label: 'Sessions', value: data?.sessions_last_7_days || 0, trend: 'Last 7d', color: '#EC4899' },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-page-enter pb-12">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-[24px] font-black text-gray-800 tracking-tight">Performance Analytics</h1>
                    <p className="text-[14px] text-gray-500 font-medium">Tracking your growth and learning efficiency</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm text-[12px] font-bold text-gray-400 uppercase">
                    Last 7 Days
                </div>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((s, i) => (
                    <div key={i} className="card p-5 bg-white border-transparent hover:border-purple-100 transition-all group">
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">{s.label}</div>
                        <div className="flex items-baseline gap-2">
                            <div className="text-2xl font-black text-gray-800" style={{ color: s.color }}>{s.value}</div>
                            <div className={`text-[10px] font-bold ${s.trend.startsWith('+') ? 'text-green-500' : 'text-gray-400'}`}>
                                {s.trend}
                            </div>
                        </div>
                        <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden mt-3">
                            <div className="h-full opacity-60 transition-all duration-1000" style={{ width: '70%', backgroundColor: s.color }}></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Learning Velocity Chart */}
                <div className="card p-6 bg-white flex flex-col space-y-6">
                    <div>
                        <h3 className="text-[16px] font-bold text-gray-800">Learning Velocity</h3>
                        <p className="text-[12px] text-gray-400">Minutes studied per day</p>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data?.study_time_velocity || []}>
                                <defs>
                                    <linearGradient id="colorMins" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fill: '#9ca3af'}} 
                                    tickFormatter={(str) => str.split('-').slice(1).join('/')}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="minutes" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorMins)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Knowledge Retention Chart */}
                <div className="card p-6 bg-white flex flex-col space-y-6">
                    <div>
                        <h3 className="text-[16px] font-bold text-gray-800">Knowledge Retention</h3>
                        <p className="text-[12px] text-gray-400">Quiz performance accuracy (%)</p>
                    </div>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.knowledge_retention || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fontSize: 10, fill: '#9ca3af'}} 
                                    tickFormatter={(str) => str.split('-').slice(1).join('/')}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} domain={[0, 100]} />
                                <Tooltip 
                                    cursor={{fill: '#f9fafb'}}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="score" fill="#10B981" radius={[4, 4, 0, 0]} barSize={30}>
                                    { (data?.knowledge_retention || []).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.score > 70 ? '#10B981' : entry.score > 40 ? '#F59E0B' : '#EF4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            
            {/* Weak Topics */}
            {data?.weak_topics?.length > 0 && (
                <div className="card p-6 bg-white border-red-100 bg-red-50/10">
                    <h3 className="text-[16px] font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Focus Areas (Weak Topics)
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {data.weak_topics.map((topic, i) => (
                            <span key={i} className="px-3 py-1.5 bg-white border border-red-100 text-red-600 rounded-lg text-[12px] font-bold shadow-sm">
                                {topic}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsPage;
