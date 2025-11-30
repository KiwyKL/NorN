import React, { useState } from 'react';
import { ArrowLeft, Gift, Ticket, Plus, Trash2 } from 'lucide-react';
import { ViewState, Language } from '../types';
import { translations } from '../services/translations';

interface Props {
    setViewState: (view: ViewState) => void;
    language: Language;
    tickets: number;
}

const WishlistView: React.FC<Props> = ({ setViewState, language, tickets }) => {
    const t = translations[language];
    const [items, setItems] = useState<string[]>([]);
    const [input, setInput] = useState('');

    const handleAdd = () => {
        if (input.trim()) {
            setItems([...items, input]);
            setInput('');
        }
    };

    const handleDelete = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    return (
        <div className="relative h-full w-full flex flex-col">
            <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url("/images/dashboard-bg.jpg")' }} />

            <div className="relative z-10 h-full w-full max-w-[375px] mx-auto overflow-hidden">
                <div onClick={() => setViewState(ViewState.DASHBOARD)} className="absolute cursor-pointer z-20 flex items-center justify-center bg-white/20 rounded-full backdrop-blur-sm hover:bg-white/30 transition" style={{ left: '5.3%', top: '3%', width: '40px', height: '40px' }}>
                    <ArrowLeft className="text-white" />
                </div>
                <div className="absolute z-20 flex items-center" style={{ left: '21.3%', top: '3.7%', width: '200px', height: '30px' }}>
                    <h2 className="text-white text-2xl font-bold font-christmas drop-shadow-lg" style={{ textShadow: '0 2px 4px black' }}>{t.wishlistTitle}</h2>
                </div>

                <div className="absolute z-10 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-xl overflow-y-auto no-scrollbar" style={{ left: '5.3%', top: '12%', width: '89.3%', height: '75%' }}>
                    <div className="p-6">

                        {/* Giveaway Card */}
                        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl p-5 text-white mb-8 shadow-lg shadow-orange-200 relative overflow-hidden">
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/20 rounded-full blur-xl"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-white/20 rounded-lg">
                                        <Ticket size={24} />
                                    </div>
                                    <h3 className="font-bold text-lg uppercase tracking-wide">{t.giveawayStatus}</h3>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-yellow-100 text-sm">{t.ticketsEarned}</p>
                                        <p className="text-4xl font-black">{tickets}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-yellow-100 text-xs mb-1">{t.nextDraw}</p>
                                        <div className="bg-white/20 px-3 py-1 rounded-lg text-xs font-bold inline-block">
                                            iPhone 17
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Wishlist Input */}
                        <div className="mb-6">
                            <label className="block text-blue-900 font-bold text-sm mb-2 uppercase">{t.myWishes}</label>
                            <div className="flex gap-2">
                                <input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="PlayStation 5..."
                                    className="flex-1 bg-slate-50 border-slate-200 border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                />
                                <button
                                    onClick={handleAdd}
                                    className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-500 shadow-md transition"
                                >
                                    <Plus size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Wishlist Items */}
                        <div className="space-y-3">
                            {items.length === 0 && (
                                <div className="text-center text-slate-400 py-8 italic">
                                    <Gift size={48} className="mx-auto mb-2 opacity-20" />
                                    Empty list... add something!
                                </div>
                            )}
                            {items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                        <span className="font-bold text-slate-700">{item}</span>
                                    </div>
                                    <button onClick={() => handleDelete(idx)} className="text-slate-300 hover:text-red-500 transition">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default WishlistView;