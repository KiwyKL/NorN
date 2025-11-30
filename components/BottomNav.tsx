import React from 'react';
import { ViewState } from '../types';
import { Home, Mail, Calendar, Gift } from 'lucide-react';

interface Props {
    view: ViewState;
    setViewState: (v: ViewState) => void;
}

const BottomNav: React.FC<Props> = ({ view, setViewState }) => {
    // Hide on Splash and Live Call
    if (view === ViewState.SPLASH || view === ViewState.LIVE_CALL) return null;

    return (
        <div className="absolute bottom-0 w-full bg-white text-slate-400 py-5 px-8 flex justify-between items-center rounded-t-[30px] shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-30 border-t border-slate-100">
            {/* Home -> Language Selection (Splash) as requested */}
            <button 
                onClick={() => setViewState(ViewState.SPLASH)} 
                className="flex flex-col items-center hover:text-red-400 transition duration-300"
            >
                <Home size={26} strokeWidth={2} />
            </button>
            
            {/* Gift -> Wishlist / Giveaway */}
            <button 
                onClick={() => setViewState(ViewState.WISHLIST)}
                className={`flex flex-col items-center transition duration-300 ${view === ViewState.WISHLIST ? 'text-red-500 scale-110' : 'hover:text-red-400'}`}
            >
                <Gift size={26} strokeWidth={view === ViewState.WISHLIST ? 2.5 : 2} />
            </button>

            {/* Calendar -> Advent Calendar */}
             <button 
                onClick={() => setViewState(ViewState.ADVENT)}
                className={`flex flex-col items-center transition duration-300 ${view === ViewState.ADVENT ? 'text-red-500 scale-110' : 'hover:text-red-400'}`}
            >
                <Calendar size={26} strokeWidth={view === ViewState.ADVENT ? 2.5 : 2} />
            </button>

            {/* Mail -> Letter View */}
             <button 
                onClick={() => setViewState(ViewState.LETTER)} 
                className={`flex flex-col items-center transition duration-300 ${view === ViewState.LETTER ? 'text-red-500 scale-110' : 'hover:text-red-400'}`}
            >
                <Mail size={26} strokeWidth={view === ViewState.LETTER ? 2.5 : 2} />
            </button>
        </div>
    )
}

export default BottomNav;