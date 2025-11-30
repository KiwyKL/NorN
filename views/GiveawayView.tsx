import React, { useState } from 'react';
import { ArrowLeft, Gift, Smartphone, CheckCircle } from 'lucide-react';
import { ViewState, Language } from '../types';
import { translations } from '../services/translations';
import { countries } from '../constants/countries';
import { submitLead } from '../services/leadService';

interface Props {
    setViewState: (view: ViewState) => void;
    language: Language;
    mode: 'participating' | 'marketing';
}

// Countries imported from shared constants

const GiveawayView: React.FC<Props> = ({ setViewState, language, mode }) => {
    const t = translations[language];
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        country: '',
        phone: ''
    });
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Submit Lead
        submitLead({
            name: formData.name,
            email: formData.email,
            country: formData.country,
            phone: formData.phone,
            source: 'giveaway',
            timestamp: new Date().toISOString(),
            metadata: { mode }
        });

        setSubmitted(true);
        // Simulate API call delay then redirect
        setTimeout(() => {
            setViewState(ViewState.DASHBOARD);
        }, 2500);
    };

    return (
        <div className="relative h-full w-full flex flex-col">
            {/* Background */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: 'url("/images/dashboard-bg.jpg")',
                }}
            />

            {/* Canvas Container */}
            <div className="relative z-10 h-full w-full max-w-[375px] mx-auto overflow-hidden">

                {/* Back Button */}
                <div
                    onClick={() => setViewState(ViewState.DASHBOARD)}
                    className="absolute cursor-pointer z-20 flex items-center justify-center bg-white/20 rounded-full backdrop-blur-sm hover:bg-white/30 transition"
                    style={{ left: '5.3%', top: '3%', width: '40px', height: '40px' }}
                >
                    <ArrowLeft className="text-white" />
                </div>

                {/* Form Container (Glassmorphism) */}
                <div
                    className="absolute z-10 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-xl overflow-y-auto no-scrollbar"
                    style={{ left: '5.3%', top: '12%', width: '89.3%', height: '75%' }}
                >
                    <div className="p-6 flex flex-col items-center">

                        {/* Header Icon */}
                        <div className="w-24 h-24 bg-gradient-to-tr from-yellow-400 to-yellow-600 rounded-3xl shadow-[0_0_30px_rgba(250,204,21,0.4)] flex items-center justify-center mb-6 animate-bounce-slow">
                            <Smartphone size={48} className="text-white drop-shadow-md" />
                        </div>

                        <h2 className="text-2xl font-bold text-center font-christmas mb-2 leading-tight text-white drop-shadow-lg" style={{ textShadow: '0 2px 4px black' }}>
                            {mode === 'participating' ? t.giveawayTitleParticipating : t.giveawayTitleMarketing}
                        </h2>
                        <p className="text-white/80 text-center text-sm mb-8">iPhone 17 Pro Max - 1TB</p>

                        {submitted ? (
                            <div className="bg-white/20 backdrop-blur-sm p-8 rounded-3xl border border-white/30 w-full text-center animate-pulse">
                                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle size={32} className="text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Success!</h3>
                                <p className="text-white/80">{t.formSuccess}</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="w-full space-y-4">
                                <div>
                                    <input
                                        required
                                        className="w-full bg-white/80 border border-white/30 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:outline-none shadow-inner"
                                        placeholder={t.fullName}
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <input
                                        required
                                        type="email"
                                        className="w-full bg-white/80 border border-white/30 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:outline-none shadow-inner"
                                        placeholder={t.email}
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <div className="relative">
                                        <select
                                            required
                                            className="w-full bg-white/80 border border-white/30 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-yellow-400 focus:outline-none shadow-inner appearance-none"
                                            value={formData.country}
                                            onChange={e => setFormData({ ...formData, country: e.target.value })}
                                        >
                                            <option value="" disabled className="text-slate-500">{t.selectCountry}</option>
                                            {countries.map(c => (
                                                <option key={c} value={c} className="text-slate-900">{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <input
                                        type="tel"
                                        className="w-full bg-white/80 border border-white/30 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:outline-none shadow-inner"
                                        placeholder={t.phoneNumber}
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-white font-bold py-4 rounded-xl shadow-lg mt-4 flex items-center justify-center gap-2 transform transition active:scale-95 border-2 border-yellow-400"
                                >
                                    <Gift size={20} /> {mode === 'participating' ? t.submitEntryParticipating : t.submitEntry}
                                </button>
                            </form>
                        )}

                    </div>
                </div>

            </div>
        </div>
    );
};

export default GiveawayView;