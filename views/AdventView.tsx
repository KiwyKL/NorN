import React, { useState } from 'react';
import { ArrowLeft, Star, Lock } from 'lucide-react';
import { ViewState, Language } from '../types';
import { translations } from '../services/translations';

interface Props {
    setViewState: (view: ViewState) => void;
    language: Language;
}

const AdventView: React.FC<Props> = ({ setViewState, language }) => {
    const t = translations[language];
    const days = Array.from({ length: 24 }, (_, i) => i + 1);
    const [opened, setOpened] = useState<number[]>([]);
    const [activeMessage, setActiveMessage] = useState<string | null>(null);

    const messages = [
        "🎄 " + t.adventMsg1,
        "🥕 " + t.adventMsg2,
        "🎁 The best gift is friendship!",
        "🍪 Santa loves cookies!",
        "⛄ Do you want to build a snowman?",
        "🦌 Rudolph has a red nose!",
        "❄️ Let it snow!",
        "🎶 Jingle bells, jingle bells!",
        "🥛 Don't forget the milk!",
        "🧣 Wear a scarf today!",
        "✨ Sparkle like a star!",
        "🔔 Ring the bells!",
        "🎅 Ho Ho Ho!",
        "👪 Hug your family!",
        "🕯️ Light a candle!",
        "🧦 Hang up your socks!",
        "🍭 Eat a candy cane!",
        "🎀 Wrap a gift!",
        "🕊️ Peace on Earth!",
        "🌲 Decorate the tree!",
        "🌠 Make a wish!",
        "🍰 Eat some cake!",
        "💤 Go to sleep early!",
        "🎅 Santa is coming tonight!"
    ];

    const handleDayClick = (day: number) => {
        if (!opened.includes(day)) {
            setOpened([...opened, day]);
        }
        setActiveMessage(messages[day - 1]);
    };

    return (
        <div className="relative h-full w-full flex flex-col">
            <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url("/images/dashboard-bg.jpg")' }} />

            <div className="relative z-10 h-full w-full max-w-[375px] mx-auto overflow-hidden">
                <div onClick={() => setViewState(ViewState.DASHBOARD)} className="absolute cursor-pointer z-20 flex items-center justify-center bg-white/20 rounded-full backdrop-blur-sm hover:bg-white/30 transition" style={{ left: '5.3%', top: '3%', width: '40px', height: '40px' }}>
                    <ArrowLeft className="text-white" />
                </div>
                <div className="absolute z-20 flex items-center" style={{ left: '21.3%', top: '3.7%', width: '200px', height: '30px' }}>
                    <h2 className="text-white text-2xl font-bold font-christmas drop-shadow-lg" style={{ textShadow: '0 2px 4px black' }}>{t.adventTitle}</h2>
                </div>

                <div className="absolute z-10 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-xl overflow-y-auto no-scrollbar" style={{ left: '5.3%', top: '12%', width: '89.3%', height: '75%' }}>
                    <div className="p-4">
                        <div className="grid grid-cols-4 gap-3">
                            {days.map(day => {
                                const isOpened = opened.includes(day);
                                return (
                                    <button
                                        key={day}
                                        onClick={() => handleDayClick(day)}
                                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative shadow-md transform transition hover:scale-105 ${isOpened ? 'bg-green-100 border-2 border-green-200' : 'bg-red-600 text-white border-b-4 border-red-800'}`}
                                    >
                                        {isOpened ? (
                                            <Star size={20} className="text-yellow-500 fill-yellow-500" />
                                        ) : (
                                            <>
                                                <span className="font-bold text-xl font-christmas">{day}</span>
                                                {day > new Date().getDate() && (
                                                    <div className="absolute inset-0 bg-black/20 rounded-2xl flex items-center justify-center">
                                                        <Lock size={16} className="opacity-50" />
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </button>
                                )
                            })}
                        </div>

                        {activeMessage && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
                                <div className="bg-white p-6 rounded-3xl shadow-2xl text-center max-w-xs animate-bounce-slow">
                                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Star className="text-blue-500 fill-blue-500" size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-blue-900 mb-2">Surprise!</h3>
                                    <p className="text-slate-600 font-medium text-lg mb-6">{activeMessage}</p>
                                    <button
                                        onClick={() => setActiveMessage(null)}
                                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200"
                                    >
                                        Awesome!
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdventView;