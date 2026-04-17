import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const chartData = [
    { name: 'React', time: 120 },
    { name: 'GraphQL', time: 80 },
    { name: 'Python', time: 200 },
    { name: 'Docker', time: 45 },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8 pl-4 border-l-4 border-blue-500">Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Profile Card */}
        <div className="bg-gray-800 p-6 rounded-xl flex flex-col items-center shadow-lg border border-gray-700">
          <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-4xl mb-4 text-white font-bold shadow-inner">
            {localStorage.getItem('name')?.charAt(0) || 'U'}
          </div>
          <h2 className="text-2xl font-bold">{localStorage.getItem('name') || 'User'}</h2>
          <p className="text-gray-400 mb-6">{localStorage.getItem('level') || 'Beginner'} Scholar</p>
          
          <div className="w-full mb-6">
            <div className="flex justify-between text-sm mb-1">
              <span>Level 5</span>
              <span className="text-yellow-400 font-bold">1200 / 2000 XP</span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: '60%' }}></div>
            </div>
          </div>

          <div className="flex gap-4 w-full text-center">
            <div className="flex-1 bg-gray-700 p-3 rounded-lg">
              <div className="text-2xl mb-1">🔥</div>
              <div className="font-bold font-mono">12</div>
              <div className="text-xs text-gray-400">Day Streak</div>
            </div>
            <div className="flex-1 bg-gray-700 p-3 rounded-lg">
              <div className="text-2xl mb-1">🏆</div>
              <div className="font-bold font-mono">8</div>
              <div className="text-xs text-gray-400">Badges</div>
            </div>
          </div>
        </div>

        {/* Center: Chart */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 lg:col-span-1 flex flex-col">
          <h2 className="text-xl font-bold mb-6">Study Time by Topic</h2>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip cursor={{fill: '#374151'}} contentStyle={{backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff'}} />
                <Bar dataKey="time" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Weak Areas */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <h2 className="text-xl font-bold mb-4">Focus Areas</h2>
          <p className="text-sm text-gray-400 mb-4">Topics needing review based on recent quizzes:</p>
          <ul className="space-y-3">
            {['Docker Networking', 'React Context API', 'Data Structures'].map((area, i) => (
              <li key={i} className="bg-gray-700 p-3 rounded flex justify-between items-center border-l-4 border-red-500">
                <span>{area}</span>
                <button className="text-xs bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded transition">Review</button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom: Leaderboard */}
      <div className="mt-6 bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
        <h2 className="text-xl font-bold mb-6 flex items-center justify-between">
          <span>Global Leaderboard</span>
          <span className="text-2xl">🌍</span>
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="pb-3 px-4 w-16">Rank</th>
                <th className="pb-3 px-4">User</th>
                <th className="pb-3 px-4 text-right">XP Total</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Alex M.', xp: 14500, top: true },
                { name: 'Priya K.', xp: 13200, top: true },
                { name: 'David W.', xp: 12100, top: true },
                { name: 'You', xp: 8400, top: false, highlight: true }
              ].map((row, i) => (
                <tr key={i} className={`border-b last:border-0 border-gray-700 transition ${row.highlight ? 'bg-blue-900/40' : 'hover:bg-gray-750'}`}>
                  <td className="py-4 px-4 font-bold text-lg">
                    {row.top ? <span className="text-yellow-400">#{i+1}</span> : `#${i+4}`}
                  </td>
                  <td className="py-4 px-4 font-medium flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs">{row.name.charAt(0)}</div>
                    {row.name}
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-blue-400">{row.xp} XP</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
