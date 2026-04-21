import EmotionPanel from '../components/EmotionPanel';

const MLMonitor = () => {
    return (
        <div className="max-w-6xl mx-auto space-y-8 py-4">
            <header className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-gray-800">Advanced ML Monitoring</h1>
                <p className="text-gray-500">Real-time analysis of your learning state using computer vision.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Monitor Area */}
                <div className="lg:col-span-4">
                    <EmotionPanel sessionId="session1" />
                </div>

                {/* Information Area */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="card p-6 bg-white shadow-sm border border-gray-100 h-full">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">How it works</h2>
                        <div className="space-y-4 text-gray-600 leading-relaxed">
                            <p>
                                Learnify AI uses <strong>DeepFace</strong> and <strong>OpenCV</strong> to analyze your facial expressions in real-time. 
                                This data helps the system understand when you are struggling, tired, or focused.
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                                <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                                    <h3 className="font-bold text-purple-900 mb-2">Confusion Detection</h3>
                                    <p className="text-sm text-purple-800/80">
                                        When the AI detects confusion, it automatically simplifies complex topics and provides more foundational context.
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                                    <h3 className="font-bold text-blue-900 mb-2">Fatigue Management</h3>
                                    <p className="text-sm text-blue-800/80">
                                        Detects signs of tiredness and suggests short 5-minute breaks to keep your learning efficiency optimal.
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                                    <h3 className="font-bold text-red-900 mb-2">Frustration Intervention</h3>
                                    <p className="text-sm text-red-800/80">
                                        If frustration is detected, the AI switches to a more encouraging tone and uses analogies to explain concepts.
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                                    <h3 className="font-bold text-emerald-900 mb-2">Attention Tracking</h3>
                                    <p className="text-sm text-emerald-800/80">
                                        Monitors your focus levels to reward you with "Deep Work" XP bonuses during high-attention sessions.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Analysis Stats (Placeholder for future telemetry) */}
            <div className="card p-6 bg-[#1a1a1a] text-white">
                <h2 className="text-lg font-bold mb-4">ML Telemetry (Session Stats)</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                        <div className="text-3xl font-mono font-bold text-purple-400">92%</div>
                        <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">Focus Score</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-mono font-bold text-emerald-400">42m</div>
                        <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">Deep Learning</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-mono font-bold text-amber-400">2</div>
                        <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">Interventions</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-mono font-bold text-blue-400">0</div>
                        <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">Fatigue Alerts</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MLMonitor;
