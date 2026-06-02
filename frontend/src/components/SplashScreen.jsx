import { useEffect, useState } from 'react';

const SplashScreen = ({ onFadeComplete }) => {
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        // Start fading out after 2.2 seconds
        const fadeTimer = setTimeout(() => {
            setFadeOut(true);
        }, 2200);

        // Notify parent when fade transition ends (matching CSS duration-700)
        const completeTimer = setTimeout(() => {
            if (onFadeComplete) onFadeComplete();
        }, 2900);

        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(completeTimer);
        };
    }, [onFadeComplete]);

    return (
        <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-[#0d0d0d] via-[#1a0b12] to-[#0d0d0d] transition-all duration-700 ${fadeOut ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100'}`}>
            <div className="relative flex flex-col items-center space-y-6">
                {/* Glow effect behind the logo */}
                <div className="absolute -inset-10 bg-[#EC4899]/20 rounded-full blur-3xl animate-pulse"></div>
                
                {/* Logo Image */}
                <img 
                    src="/learnify-logo.png" 
                    alt="Learnify AI Logo" 
                    className="w-28 h-28 md:w-36 md:h-36 object-contain relative z-10 animate-[bounceIn_1s_ease-out_forwards]"
                />

                {/* App Name */}
                <div className="text-center relative z-10">
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter flex items-center justify-center gap-1.5">
                        Learnify <span className="text-[#EC4899]">AI</span>
                    </h1>
                    <p className="text-[11px] font-bold text-pink-400/60 uppercase tracking-[0.25em] mt-2">
                        Next-Gen Personalized Learning
                    </p>
                </div>

                {/* Elegant loading indicator */}
                <div className="w-40 h-[3px] bg-white/10 rounded-full overflow-hidden relative z-10">
                    <div className="h-full bg-gradient-to-r from-pink-500 to-[#EC4899] w-full rounded-full animate-[loadingProgress_2s_ease-in-out_infinite]"></div>
                </div>
            </div>

            <style>{`
                @keyframes bounceIn {
                    0% { opacity: 0; transform: scale(0.3); }
                    50% { opacity: 0.9; transform: scale(1.1); }
                    80% { transform: scale(0.9); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes loadingProgress {
                    0% { transform: translateX(-100%); }
                    50% { transform: translateX(0); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
};

export default SplashScreen;
