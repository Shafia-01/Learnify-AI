import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register, login } from '../api/auth';
import { useToast } from '../context/ToastContext';

const Onboarding = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [level, setLevel] = useState('Intermediate');
    const [language, setLanguage] = useState('English');
    const [isLoading, setIsLoading] = useState(false);
    const [isLogin, setIsLogin] = useState(false);
    const { addToast } = useToast();

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            await login(email, password);
            addToast("Welcome back!", "success");
            navigate('/dashboard');
        } catch (err) {
            console.error("Login failed", err);
            const errorMessage = err.response?.data?.detail || "Login failed. Please check your credentials.";
            addToast(errorMessage, "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleComplete = async () => {
        setIsLoading(true);
        try {
            await register({
                name,
                email,
                password,
                level,
                language
            });
            addToast("Welcome to Learnify AI!", "success");
            navigate('/upload');
        } catch (err) {
            console.error("Onboarding failed", err);
            const detail = err.response?.data?.detail;
            const errorMessage = detail || "Registration failed. Please check your details.";
            
            if (detail === "Email is already registered") {
                addToast("This email is already registered. Try logging in instead!", "warning");
                setIsLogin(true);
                setStep(1);
            } else {
                addToast(errorMessage, "error");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const steps = [
        { id: 1, title: 'Name entry' },
        { id: 2, title: 'Level selection' },
        { id: 3, title: 'Language selection' }
    ];

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 animate-page-enter">
            <div className="max-w-md w-full space-y-8">
                {/* Logo & Step Indicator */}
                <div className="text-center space-y-6">
                    <div className="text-2xl font-black text-[#EC4899] tracking-tighter flex items-center justify-center gap-2">
                        <div className="w-8 h-8 bg-[#EC4899] rounded-lg flex items-center justify-center text-white text-sm">L</div>
                        Learnify AI
                    </div>
                    <div className="flex gap-2 justify-center">
                        {steps.map((s) => (
                            <div 
                                key={s.id} 
                                className={`h-1 w-12 rounded-full transition-all duration-500 ${s.id <= step ? 'bg-[#EC4899]' : 'bg-[#FBCFE8]'}`}
                            ></div>
                        ))}
                    </div>
                </div>

                {/* Content Card */}
                <div className="bg-white/40 backdrop-blur-xl rounded-[24px] p-8 shadow-xl shadow-pink-500/5 border border-white/60">
                    {step === 1 && (
                        <div className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
                            <div className="space-y-1">
                                <h1 className="text-[20px] font-black text-[#9D174D]">
                                    {isLogin ? 'Sign in to account' : 'Create your account'}
                                </h1>
                                <p className="text-[12px] text-pink-400 font-medium">
                                    {isLogin ? 'Welcome back, explorer!' : 'Join the community of explorers'}
                                </p>
                            </div>
                            <div className="space-y-3">
                                {!isLogin && (
                                    <input 
                                        type="text" 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Full Name"
                                        className="w-full bg-white border border-pink-100 rounded-[12px] px-4 py-3 text-[14px] font-bold text-gray-800 outline-none focus:border-[#EC4899] transition-all"
                                    />
                                )}
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Email Address"
                                    className="w-full bg-white border border-pink-100 rounded-[12px] px-4 py-3 text-[14px] font-bold text-gray-800 outline-none focus:border-[#EC4899] transition-all"
                                />
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={isLogin ? "Password" : "Create Password (min 8 chars)"}
                                    className="w-full bg-white border border-pink-100 rounded-[12px] px-4 py-3 text-[14px] font-bold text-gray-800 outline-none focus:border-[#EC4899] transition-all"
                                />
                            </div>

                            {isLogin ? (
                                <button 
                                    onClick={handleLogin}
                                    disabled={!email.includes('@') || !password || isLoading}
                                    className="w-full bg-[#EC4899] hover:bg-[#D81B60] text-white py-3.5 rounded-[12px] font-bold shadow-lg shadow-pink-500/20 transition-all disabled:opacity-50"
                                >
                                    {isLoading ? 'Signing in...' : 'Sign In'}
                                </button>
                            ) : (
                                <button 
                                    onClick={() => setStep(2)}
                                    disabled={
                                        !name.trim() || 
                                        !email.includes('@') || 
                                        password.length < 8 ||
                                        !/[A-Z]/.test(password) ||
                                        !/[0-9]/.test(password)
                                    }
                                    className="w-full bg-[#EC4899] hover:bg-[#D81B60] text-white py-3.5 rounded-[12px] font-bold shadow-lg shadow-pink-500/20 transition-all disabled:opacity-50"
                                >
                                    Continue — Personalized Selection
                                </button>
                            )}

                            {!isLogin && (
                                <div className="mt-2 space-y-1">
                                    <p className={`text-[10px] ${password.length >= 8 ? 'text-green-500' : 'text-pink-300'}`}>• At least 8 characters</p>
                                    <p className={`text-[10px] ${/[A-Z]/.test(password) ? 'text-green-500' : 'text-pink-300'}`}>• At least one uppercase letter</p>
                                    <p className={`text-[10px] ${/[0-9]/.test(password) ? 'text-green-500' : 'text-pink-300'}`}>• At least one digit</p>
                                </div>
                            )}

                            <div className="text-center pt-2">
                                <button 
                                    onClick={() => setIsLogin(!isLogin)}
                                    className="text-[12px] text-pink-500 font-bold hover:underline"
                                >
                                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                            <h1 className="text-[20px] font-black text-[#9D174D]">Select your level</h1>
                            <div className="space-y-3">
                                {[
                                    { id: 'Beginner', desc: 'Starting from scratch. Simple explanations.' },
                                    { id: 'Intermediate', desc: 'Has some background knowledge. Deeper dives.' },
                                    { id: 'Advanced', desc: 'Expert level. Technical, concise answers.' }
                                ].map((lvl) => (
                                    <button
                                        key={lvl.id}
                                        onClick={() => setLevel(lvl.id)}
                                        className={`w-full text-left p-4 rounded-[16px] transition-all border ${
                                            level === lvl.id 
                                                ? 'bg-[#FDF2F8] border-[#EC4899] border-[1.5px] shadow-sm' 
                                                : 'bg-white border-pink-50 hover:border-pink-200'
                                        }`}
                                    >
                                        <div className="text-[14px] font-bold text-[#9D174D]">{lvl.id}</div>
                                        <div className="text-[11px] text-pink-400 font-medium">{lvl.desc}</div>
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setStep(1)}
                                    className="px-6 text-pink-400 font-bold hover:bg-pink-50 rounded-[12px] transition-all"
                                >
                                    Back
                                </button>
                                <button 
                                    onClick={() => setStep(3)}
                                    className="flex-1 bg-[#EC4899] hover:bg-[#D81B60] text-white py-3.5 rounded-[12px] font-bold shadow-lg shadow-pink-500/20 transition-all"
                                >
                                    Next — Choose Language
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
                            <h1 className="text-[20px] font-black text-[#9D174D]">Preferred language</h1>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-pink-400 uppercase tracking-wider">Select language</label>
                                <select 
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="w-full bg-white border border-pink-100 rounded-[12px] px-4 py-3 text-[15px] font-bold text-gray-800 outline-none focus:border-[#EC4899] transition-all"
                                >
                                    <option>English</option>
                                    <option>Spanish</option>
                                    <option>French</option>
                                    <option>German</option>
                                    <option>Hindi</option>
                                    <option>Urdu</option>
                                </select>
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setStep(2)}
                                    className="px-6 text-pink-400 font-bold hover:bg-pink-50 rounded-[12px] transition-all"
                                >
                                    Back
                                </button>
                                <button 
                                    onClick={handleComplete}
                                    disabled={isLoading}
                                    className="flex-1 bg-[#10B981] hover:bg-[#059669] text-white py-3.5 rounded-[12px] font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-70"
                                >
                                    {isLoading ? 'Creating Account...' : 'Get Started'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default Onboarding;
