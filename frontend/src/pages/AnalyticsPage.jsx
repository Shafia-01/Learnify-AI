
const AnalyticsPage = () => {
    const stats = [
        { label: 'Study Time', value: '0h', trend: '0%', color: '#60A5FA' },
        { label: 'Retention', value: '0%', trend: '0%', color: '#10B981' },
        { label: 'Efficiency', value: '0%', trend: '0%', color: '#F59E0B' },
        { label: 'Focus Score', value: '0', trend: '0', color: '#EC4899' },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-page-enter">
            <header>
                <h1 className="text-[20px] font-black text-gray-800 tracking-tight">Performance Analytics</h1>
                <p className="text-[13px] text-gray-500 font-medium">Tracking your growth and learning efficiency</p>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((s, i) => (
                    <div key={i} className="card p-5 bg-white space-y-2">
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{s.label}</div>
                        <div className="flex items-baseline gap-2">
                            <div className="text-2xl font-black text-gray-800" style={{ color: s.color }}>{s.value}</div>
                            <div className={`text-[10px] font-bold ${s.trend.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                                {s.trend}
                            </div>
                        </div>
                        <div className="h-1 w-full bg-gray-50 rounded-full overflow-hidden">
                            <div className="h-full opacity-60" style={{ width: '70%', backgroundColor: s.color }}></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card p-6 min-h-[300px] flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-500">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                    </div>
                    <div className="text-center">
                        <h3 className="text-[15px] font-bold text-gray-800">Learning Velocity</h3>
                        <p className="text-[11px] text-gray-400">Detailed charts are being synthesized...</p>
                    </div>
                </div>
                <div className="card p-6 min-h-[300px] flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center text-purple-500">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                    <div className="text-center">
                        <h3 className="text-[15px] font-bold text-gray-800">Knowledge Retention</h3>
                        <p className="text-[11px] text-gray-400">Wait for few more quizzes for personalized insights.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;
