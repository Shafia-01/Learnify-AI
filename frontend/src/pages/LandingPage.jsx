import { useNavigate } from 'react-router-dom';

const features = [
  {
    title: "Intelligent Tutoring",
    description: "AI-powered tutoring that adapts in real time to each learner's level and pace.",
    icon: (
      <svg className="w-6 h-6 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    color: "bg-[#EAE2FC] border-[#8B5CF6]/30 hover:border-[#8B5CF6] hover:shadow-[#8B5CF6]/20"
  },
  {
    title: "Multimodal Learning",
    description: "Learn from PDFs, PPTs, and text with quiz generation, knowledge graphs, and analytics.",
    icon: (
      <svg className="w-6 h-6 text-[#F97316]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: "bg-[#FCECE5] border-[#F97316]/30 hover:border-[#F97316] hover:shadow-[#F97316]/20"
  },
  {
    title: "Emotion-Aware Assistance",
    description: "Affective computing via webcam detects confusion, fatigue, and frustration to adapt responses.",
    icon: (
      <svg className="w-6 h-6 text-[#EC4899]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: "bg-[#FCE5F3] border-[#F472B6]/30 hover:border-[#F472B6] hover:shadow-[#F472B6]/20"
  },
  {
    title: "Smart Knowledge Retrieval",
    description: "RAG-powered contextual answers grounded in your uploaded study material.",
    icon: (
      <svg className="w-6 h-6 text-[#0D9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    color: "bg-[#CCFBF1] border-[#0D9488]/30 hover:border-[#0D9488] hover:shadow-[#0D9488]/20"
  },
  {
    title: "Learning Analytics",
    description: "Visual dashboards tracking performance, accuracy trends, weak topics, and study velocity.",
    icon: (
      <svg className="w-6 h-6 text-[#2563EB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: "bg-[#DCEEFE] border-[#2563EB]/30 hover:border-[#2563EB] hover:shadow-[#2563EB]/20"
  },
  {
    title: "Gamified Learning",
    description: "XP points, badges, streaks, leaderboards, and 6 AI-powered mini-games.",
    icon: (
      <svg className="w-6 h-6 text-[#EAB308]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2zm-2 4h4M5 13a2 2 0 100-4 2 2 0 000 4zm14 0a2 2 0 100-4 2 2 0 000 4z" />
      </svg>
    ),
    color: "bg-[#FBF8D3] border-[#EAB308]/30 hover:border-[#EAB308] hover:shadow-[#EAB308]/20"
  },
  {
    title: "AI Study Companion",
    description: "A personalized AI mentor available at every step, in your preferred language.",
    icon: (
      <svg className="w-6 h-6 text-[#84CC16]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    color: "bg-[#EAF5DB] border-[#84CC16]/30 hover:border-[#84CC16] hover:shadow-[#84CC16]/20"
  }
];

const LandingPage = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/onboarding', { state: { isLogin: false } });
  };

  const handleSignIn = () => {
    navigate('/onboarding', { state: { isLogin: true } });
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white overflow-hidden relative font-sans selection:bg-[#EC4899] selection:text-white">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(236,72,153,0.15),rgba(255,255,255,0))] pointer-events-none" />
      
      {/* Header bar */}
      <nav className="w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-1.5 shadow-md">
            <img src="/learnify-logo.webp" alt="Learnify AI Logo" className="w-7 h-7 object-contain" />
          </div>
          <span className="text-xl font-black text-white tracking-tighter">
            Learnify <span className="text-[#EC4899]">AI</span>
          </span>
        </div>
        <button 
          onClick={handleSignIn}
          className="text-sm font-bold px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-[#EC4899] text-white shadow-md shadow-pink-500/20 hover:shadow-pink-500/35 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
        >
          Sign In
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative max-w-5xl mx-auto px-6 pt-16 pb-24 text-center z-10 flex flex-col items-center">
        {/* Animated badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EC4899]/10 border border-[#EC4899]/30 text-xs font-semibold text-pink-400 mb-8 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EC4899]"></span>
          LEARNIFY AI: Academic Intelligent Tutoring
        </div>

        {/* Large Logo */}
        <div className="relative mb-6 group">
          <div className="absolute -inset-10 bg-[#EC4899]/25 rounded-full blur-3xl group-hover:bg-[#EC4899]/35 transition-all duration-700"></div>
          <div className="w-36 h-36 md:w-44 md:h-44 rounded-full bg-white flex items-center justify-center p-4 shadow-2xl relative z-10 hover:scale-105 transition-all duration-500">
            <img 
              src="/learnify-logo.webp" 
              alt="Learnify AI logo" 
              className="w-full h-full object-contain" 
            />
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white max-w-3xl leading-none">
          Learnify <span className="text-[#EC4899]">AI</span>
        </h1>
        
        <p className="text-lg md:text-xl font-bold text-pink-400/80 uppercase tracking-[0.2em] mt-4">
          AI That Learns How You Learn
        </p>

        <p className="text-gray-400 text-sm md:text-base max-w-2xl mt-6 leading-relaxed">
          Personalized learning powered by Multimodal AI, Retrieval-Augmented Generation (RAG), Affective Computing, and Gamified Adaptive Learning.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-10">
          <button 
            onClick={handleGetStarted}
            className="w-full sm:w-auto px-10 py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-[#EC4899] text-white font-bold shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
          >
            Sign Up
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 relative z-10 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-black tracking-tight text-white">
            Intelligent Features for <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-400">Next-Gen Education</span>
          </h2>
          <p className="text-gray-400 text-xs uppercase tracking-widest font-bold mt-2">
            Features designed to adapt to your mind
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.slice(0, 6).map((feat, index) => (
            <div 
              key={index} 
              className={`p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${feat.color}`}
            >
              <div className="w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center mb-5 border border-black/5 shadow-sm">
                {feat.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{feat.title}</h3>
              <p className="text-gray-700 text-sm leading-relaxed">{feat.description}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-6">
          <div className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
            <div className={`p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${features[6].color}`}>
              <div className="w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center mb-5 border border-black/5 shadow-sm">
                {features[6].icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{features[6].title}</h3>
              <p className="text-gray-700 text-sm leading-relaxed">{features[6].description}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Learnify AI Section */}
      <section className="max-w-5xl mx-auto px-6 py-20 relative z-10 border-t border-white/5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Adapts to You
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
              Unlike traditional learning platforms...
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              We don't force you into a one-size-fits-all curriculum. Learnify AI combines state-of-the-art cognitive sciences and computer vision to deliver a system that reacts to your cognitive states.
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-2xl font-black text-[#EC4899] font-mono">01</span>
              <h4 className="font-bold text-white mt-2">Affective Computing</h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">Webcam monitoring checks for fatigue or confusion and gives live feedback interventions.</p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-2xl font-black text-emerald-400 font-mono">02</span>
              <h4 className="font-bold text-white mt-2">Contextual RAG Retrieval</h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">Search through your slide decks and textbooks with intelligent vector mappings.</p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-2xl font-black text-blue-400 font-mono">03</span>
              <h4 className="font-bold text-white mt-2">Gamified Motivation</h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">Earn badges, keep learning streaks alive, and gain XP with custom-tailored mini-games.</p>
            </div>

            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-2xl font-black text-purple-400 font-mono">04</span>
              <h4 className="font-bold text-white mt-2">Adaptive Learning</h4>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">Real-time level adjustment ensures materials are never too simple or too complex.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-white/5 py-12 bg-black/40 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center p-1 shadow-md">
              <img src="/learnify-logo.webp" alt="Learnify AI Logo" className="w-6 h-6 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tight text-white">Learnify <span className="text-[#EC4899]">AI</span></span>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">AI That Learns How You Learn</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center md:text-right">
            Built with AI, Personalization, and Intelligent Learning. © {new Date().getFullYear()} Learnify AI.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
