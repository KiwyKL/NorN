
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react';
import { ViewState, ChatMessage, Language } from '../types';
import { translations } from '../services/translations';
import { createChatSession } from '../services/geminiService';
import { countries } from '../constants/countries';
import { Chat } from "@google/genai";
import { submitLead } from '../services/leadService';

interface Props {
    setViewState: (view: ViewState) => void;
    language: Language;
}

// Countries imported from shared constants

const ChatView: React.FC<Props> = ({ setViewState, language }) => {
    const t = translations[language];
    const [step, setStep] = useState<'setup' | 'chat'>('setup');

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [country, setCountry] = useState('');
    const [age, setAge] = useState('');
    const [validationError, setValidationError] = useState<string | null>(null);

    // Chat State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const chatSession = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (step === 'chat' && messages.length === 0) {
            // Initialize chat messages when entering chat mode
            setMessages([
                { id: '0', role: 'model', text: `Ho Ho Ho! Hello ${name}! ${t.dashboardTitle}` }
            ]);
        }
    }, [step, name, t.dashboardTitle, messages.length]);

    useEffect(() => {
        if (step === 'chat') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, step]);

    const handleStartChat = () => {
        if (!name.trim() || !email.trim() || !country.trim()) {
            setValidationError("Please fill all required fields / Completa los campos requeridos");
            return;
        }

        // Map Language enum to string expected by geminiService
        const languageMap: Record<string, string> = {
            'Español': 'Spanish',
            'English': 'English',
            'Français': 'French',
            'Deutsch': 'German',
            'Italiano': 'Italian',
            'Português': 'Portuguese'
        };

        const geminiLanguage = languageMap[language] || 'Spanish';

        // Initialize Gemini Chat with User Context and Language
        chatSession.current = createChatSession(name, country, age, geminiLanguage);

        // Submit Lead
        submitLead({
            name,
            email,
            country,
            source: 'chat',
            timestamp: new Date().toISOString(),
            metadata: { age }
        });

        setValidationError(null);
        setStep('chat');
    };

    const handleSend = async () => {
        if (!input.trim() || loading || !chatSession.current) return;

        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            // Send just the text string
            const result = await chatSession.current.sendMessage(userMsg.text);
            const responseText = result.text || "Ho ho...";

            const modelMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: responseText };
            setMessages(prev => [...prev, modelMsg]);
        } catch (error) {
            console.error("Chat Error", error);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Ho ho! I'm having trouble hearing you. Can you try again?" }]);
        } finally {
            setLoading(false);
        }
    };

    if (step === 'setup') {
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

                    {/* Title */}
                    <div
                        className="absolute z-20 flex items-center"
                        style={{ left: '21.3%', top: '3.7%', width: '200px', height: '30px' }}
                    >
                        <h2 className="text-white text-2xl font-bold font-christmas drop-shadow-lg" style={{ textShadow: '0 2px 4px black' }}>
                            {t.chatSetupTitle}
                        </h2>
                    </div>

                    {/* Form Container (Glassmorphism) */}
                    <div
                        className="absolute z-10 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-xl"
                        style={{ left: '5.3%', top: '12%', width: '89.3%', height: '67%' }}
                    />

                    {/* Icon */}
                    <div
                        className="absolute z-20 flex items-center justify-center"
                        style={{ left: '38%', top: '15%', width: '80px', height: '80px' }}
                    >
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30 shadow-lg">
                            <MessageCircle size={40} className="text-white" />
                        </div>
                    </div>

                    {/* Name Input */}
                    <div className="absolute z-20" style={{ left: '10.6%', top: '30%', width: '78.7%', height: '45px' }}>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full h-full bg-white/80 border border-white/30 rounded-xl px-4 text-slate-800 placeholder-slate-500 focus:ring-2 focus:ring-blue-400 focus:outline-none shadow-inner"
                            placeholder={t.fullName}
                        />
                    </div>

                    {/* Email Input */}
                    <div className="absolute z-20" style={{ left: '10.6%', top: '38%', width: '78.7%', height: '45px' }}>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-full bg-white/80 border border-white/30 rounded-xl px-4 text-slate-800 placeholder-slate-500 focus:ring-2 focus:ring-blue-400 focus:outline-none shadow-inner"
                            placeholder={t.email}
                        />
                    </div>

                    {/* Country Select */}
                    <div className="absolute z-20" style={{ left: '10.6%', top: '46%', width: '37.3%', height: '45px' }}>
                        <select
                            className="w-full h-full bg-white/80 border border-white/30 rounded-xl px-2 text-slate-800 focus:ring-2 focus:ring-blue-400 focus:outline-none appearance-none text-sm shadow-inner"
                            value={country}
                            onChange={e => setCountry(e.target.value)}
                        >
                            <option value="" disabled>{t.selectCountry}</option>
                            {countries.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Age Input */}
                    <div className="absolute z-20" style={{ left: '52%', top: '46%', width: '37.3%', height: '45px' }}>
                        <input
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
                            className="w-full h-full bg-white/80 border border-white/30 rounded-xl px-4 text-slate-800 placeholder-slate-500 focus:ring-2 focus:ring-blue-400 focus:outline-none shadow-inner"
                            placeholder={t.age}
                        />
                    </div>

                    {/* Start Chat Button */}
                    <div
                        onClick={handleStartChat}
                        className="absolute z-20 cursor-pointer flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg transition active:scale-95 border-2 border-red-400"
                        style={{ left: '10.6%', top: '69%', width: '78.7%', height: '50px' }}
                    >
                        <MessageCircle size={20} /> {t.startChat}
                    </div>

                    {/* Validation Error Toast */}
                    {validationError && (
                        <div className="absolute z-50 top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full shadow-xl text-xs font-bold animate-bounce whitespace-nowrap">
                            {validationError}
                        </div>
                    )}

                </div>
            </div>
        );
    }

    // CHAT INTERFACE
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
            <div className="relative z-10 h-full w-full max-w-[375px] mx-auto overflow-hidden flex flex-col">

                {/* Header */}
                <div className="relative z-20 pt-6 pb-4 px-4 flex items-center">
                    <div
                        onClick={() => setViewState(ViewState.DASHBOARD)}
                        className="cursor-pointer flex items-center justify-center bg-white/20 rounded-full backdrop-blur-sm hover:bg-white/30 transition mr-3"
                        style={{ width: '40px', height: '40px' }}
                    >
                        <ArrowLeft className="text-white" />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-md">
                            <img src="/images/santa-profile.jpg" alt="Santa" className="w-full h-full object-cover bg-red-100" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white drop-shadow-lg">{t.chatSantaName}</h3>
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-glow"></span>
                                <p className="text-xs text-white/80">{t.online}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Messages Container (Glassmorphism) */}
                <div className="flex-1 relative z-10 mx-4 mb-24 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-xl overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pt-8">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl p-4 text-sm shadow-lg ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-white/90 text-slate-800 rounded-tl-none border border-white/40'
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {loading && <div className="text-white/60 text-xs text-center italic">Typing...</div>}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white/5 backdrop-blur-sm border-t border-white/20">
                        <div className="flex gap-2 items-center bg-white/80 rounded-2xl px-2 py-2 border border-white/30 shadow-inner">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder={t.typeMessage}
                                className="flex-1 bg-transparent text-slate-800 px-3 py-2 focus:outline-none placeholder-slate-500"
                            />
                            <button
                                onClick={handleSend}
                                disabled={loading}
                                className="bg-red-600 text-white p-3 rounded-xl hover:bg-red-500 disabled:opacity-50 shadow-md transition"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ChatView;
