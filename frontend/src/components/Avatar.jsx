import { getInitials } from '../utils/helpers';

const Avatar = ({ name, size = 'sm' }) => {
    const initials = getInitials(name);
    
    if (size === 'lg') {
        return (
            <div className="w-11 h-11 flex-shrink-0 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center border-2 border-white/10 shadow-xl hover:rotate-3 transition-all cursor-pointer">
                <span className="text-[16px] font-black text-white uppercase tracking-wider">{initials}</span>
            </div>
        );
    }
    
    return (
        <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center border border-white shadow-sm">
            <span className="text-[12px] font-black text-white uppercase tracking-wider">{initials}</span>
        </div>
    );
};

export default Avatar;
