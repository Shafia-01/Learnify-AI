import React from 'react';

const EmptyState = ({ icon, title, description, actionLabel, onAction }) => {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center space-y-6 animate-page-enter">
            <div className="w-24 h-24 bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-sm">
                <span className="text-4xl">{icon}</span>
            </div>
            <div className="space-y-2 max-w-[280px]">
                <h3 className="text-[16px] font-black text-gray-800 tracking-tight">{title}</h3>
                <p className="text-[13px] text-gray-400 font-medium leading-relaxed">
                    {description}
                </p>
            </div>
            {actionLabel && (
                <button 
                    onClick={onAction}
                    className="bg-[var(--accent)] hover:brightness-110 text-white px-8 py-3 rounded-[12px] font-bold shadow-lg transition-all active:scale-[0.98]"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
