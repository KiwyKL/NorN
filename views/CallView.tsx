import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Mic, MicOff, PhoneOff, AlertCircle } from 'lucide-react';
import { ViewState, CallContextData, Language } from '../types';
import { billingService } from '../services/billingService';
import { translations } from '../services/translations';
import { getLiveClient, generatePersonaInstruction } from '../services/geminiService';
import { decode, decodeAudioData, createPCM16Blob } from '../services/geminiUtils';
import { LiveServerMessage, Modality } from '@google/genai';
import { submitLead } from '../services/leadService';

interface Props {
    setViewState: (view: ViewState) => void;
    language: Language;
    initialPersona: 'santa' | 'grinch' | 'spicy_santa';
    setGiveawayMode: (mode: 'participating' | 'marketing') => void;
    addTicket: () => void;
}

const CallView: React.FC<Props> = ({ setViewState, language, initialPersona, setGiveawayMode, addTicket }) => {
    const t = translations[language];
    const [step, setStep] = useState<'setup' | 'live'>('setup');
    const [formData, setFormData] = useState<CallContextData>({
        recipientName: '',
        age: '',
        gifts: '',
        behavior: 'Bien',
        details: '',
        persona: initialPersona,
        email: ''
    });
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [permissionError, setPermissionError] = useState<string | null>(null);
    const [callDuration, setCallDuration] = useState(0);

    // Refs for mutable state accessed in callbacks/processors
    const isMutedRef = useRef(isMuted);
    const mountedRef = useRef(true);
    const [isRecording, setIsRecording] = useState(false);
    const isStartingRef = useRef(false);

    // Check call balance on mount
    useEffect(() => {
        const isDemoCall = localStorage.getItem('isDemoCall') === 'true';
        const availableCalls = billingService.getAvailableCalls();

        // If demo call, skip balance check
        if (isDemoCall) {
            console.log('Demo call mode - skipping balance check');
            return;
        }

        // If no calls available and not in demo mode, redirect to store
        if (availableCalls === 0) {
            alert('¡Necesitas comprar llamadas para continuar!\n\nSerás redirigido a la tienda.');
            setViewState(ViewState.STORE);
        }
    }, [setViewState]);

    // Auto-hangup for demo calls after 8 seconds
    useEffect(() => {
        const isDemoCall = localStorage.getItem('isDemoCall') === 'true';

        if (isDemoCall && isConnected) {
            console.log('Demo call - will auto-hangup in 8 seconds');
            const timeout = setTimeout(() => {
                console.log('Demo call timeout - hanging up');
                localStorage.removeItem('isDemoCall'); // Clean up flag
                endCall();
            }, 8000); // 8 seconds

            return () => clearTimeout(timeout);
        }
    }, [isConnected]); // Dependency on isConnected

    const audioContextRef = useRef<AudioContext | null>(null);
    const inputContextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const nextStartTimeRef = useRef<number>(0);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);

    // Keep ref in sync with state
    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

    // Mount tracking
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Timer Logic
    useEffect(() => {
        let interval: any;
        if (isConnected) {
            interval = setInterval(() => {
                setCallDuration(d => d + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isConnected]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const cleanup = () => {
        console.log('Cleaning up call resources...');

        // 1. Stop MediaStream Tracks (Mic)
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        // 2. Disconnect Audio Nodes
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }

        // 3. Close Audio Contexts
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (inputContextRef.current && inputContextRef.current.state !== 'closed') {
            inputContextRef.current.close();
            inputContextRef.current = null;
        }

        // 4. Reset state if mounted
        if (mountedRef.current) {
            setIsConnected(false);
            setCallDuration(0);
        }

        // 5. Close Session (Async best effort)
        sessionPromiseRef.current = null;
    };

    const startCall = async () => {
        if (!mountedRef.current || isStartingRef.current) return;
        isStartingRef.current = true;

        // Double check cleanup before starting
        cleanup();
        if (mountedRef.current) setPermissionError(null);

        // Submit Lead
        if (formData.email) {
            submitLead({
                name: formData.recipientName,
                email: formData.email,
                source: 'call',
                timestamp: new Date().toISOString(),
                metadata: { persona: formData.persona, age: formData.age }
            });
        }

        try {
            // Request permissions specifically (Audio Only)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

            if (!mountedRef.current) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }

            setIsConnected(true);

            const ai = getLiveClient();

            // Map Language enum to language name for generatePersonaInstruction
            let langName = 'Spanish'; // Default
            if (language === 'English') langName = 'English';
            else if (language === 'Français') langName = 'French';
            else if (language === 'Deutsch') langName = 'German';
            else if (language === 'Italiano') langName = 'Italian';
            else if (language === 'Português') langName = 'Portuguese';
            else if (language === 'Español') langName = 'Spanish';

            const systemInstruction = await generatePersonaInstruction(formData, langName);

            if (!mountedRef.current) return;

            // Setup Output Audio
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            audioContextRef.current = audioCtx;
            nextStartTimeRef.current = 0;

            // Setup Input Stream (Audio)
            streamRef.current = stream;

            // Setup Input Processing - IMPORTANT: Set sampleRate to 16000 like AI Studio
            const inputCtx = new AudioContext({ sampleRate: 16000 });
            inputContextRef.current = inputCtx;
            const source = inputCtx.createMediaStreamSource(stream);
            sourceRef.current = source;

            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
                if (isMutedRef.current || !sessionPromiseRef.current) return;

                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createPCM16Blob(inputData);

                // IMPORTANT: Use Promise.then like AI Studio
                sessionPromiseRef.current.then((session: any) => {
                    try {
                        session.sendRealtimeInput({ media: pcmBlob });
                    } catch (err) {
                        console.warn("Error sending audio input:", err);
                    }
                });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);

            // Voice Selection based on Persona
            let voiceName = 'Charon'; // Default for Santas (Normal & Spicy)

            if (formData.persona === 'grinch') {
                voiceName = 'Fenrir'; // User requested Fenrir for Grinch
            }

            // Connect to Gemini Live - USING AI STUDIO MODEL & CONFIG
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',  // Better native audio synthesis
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction: systemInstruction,
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: {
                                voiceName: voiceName
                            }
                        }
                        // NO languageCode - let Gemini auto-detect from systemInstruction
                    }
                    // NO generationConfig - default settings produce more natural voice
                },
                callbacks: {
                    onopen: () => {
                        console.log('Gemini Live Connected');
                        if (mountedRef.current) {
                            setIsConnected(true);
                            // setStatusMessage(''); // This line was not in the original code, but was in the provided diff. Adding it.
                        }

                        // KICKSTART: Send initial greeting so Santa speaks first
                        sessionPromise.then(session => {
                            try {
                                const isDemoCall = localStorage.getItem('isDemoCall') === 'true';
                                const greeting = isDemoCall
                                    ? `Hello! I am ${formData.recipientName}. This is a demo call.`
                                    : `Hello! I am ${formData.recipientName}.`;
                                session.sendRealtimeInput([{ text: greeting }]);
                            } catch (e) {
                                console.log("Could not send initial greeting", e);
                            }
                        });
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        if (!mountedRef.current) return;

                        const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (audioData) {
                            const ctx = audioContextRef.current;
                            if (!ctx || ctx.state === 'closed') return;

                            // Sync playback time
                            if (nextStartTimeRef.current < ctx.currentTime) {
                                nextStartTimeRef.current = ctx.currentTime;
                            }

                            try {
                                // Gemini sends PCM16 raw audio, not compressed formats
                                // Use custom decoder for PCM16 -> AudioBuffer
                                const audioBuffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
                                const bufferSource = ctx.createBufferSource();
                                bufferSource.buffer = audioBuffer;

                                // --- AUDIO EFFECTS CHAIN (COMO AI STUDIO) ---
                                // 1. Bass Boost (Cinematic Voice Effect)
                                const bassFilter = ctx.createBiquadFilter();
                                bassFilter.type = 'lowshelf';
                                bassFilter.frequency.value = 200;
                                bassFilter.gain.value = 10;

                                // 2. Gain Boost (Volume)
                                const gainNode = ctx.createGain();
                                gainNode.gain.value = 1.5;

                                // 3. Playback Rate Logic (The "Vibe" Controller)
                                if (formData.persona === 'grinch') {
                                    // Grinch (Fenrir): Más lento para sonar más tosco/ronco
                                    bufferSource.playbackRate.value = 0.85;
                                } else if (formData.persona === 'spicy_santa') {
                                    // Spicy Santa (Charon): Igual que Santa normal para mantener la voz profunda
                                    bufferSource.playbackRate.value = 0.96;
                                } else {
                                    // Santa Normal (Charon): Abuelito tierno
                                    bufferSource.playbackRate.value = 0.96;
                                }

                                // Connect the Graph: Source -> Filter -> Gain -> Destination
                                bufferSource.connect(bassFilter);
                                bassFilter.connect(gainNode);
                                gainNode.connect(ctx.destination);

                                const duration = audioBuffer.duration / bufferSource.playbackRate.value;

                                bufferSource.start(nextStartTimeRef.current);
                                nextStartTimeRef.current += duration;
                            } catch (e) {
                                console.error("Error decoding/playing audio:", e);
                            }
                        }
                    },
                    onclose: () => {
                        console.log("Gemini Session closed");
                        if (mountedRef.current) setIsConnected(false);
                    },
                    onerror: (e) => console.error("Gemini Session Error:", e),
                }
            });

            sessionPromiseRef.current = sessionPromise;

        } catch (e: any) {
            console.error("Failed to start call", e);
            let msg = "Unable to access microphone.";

            if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
                msg = "Permission denied. Please allow microphone access.";
            } else if (e.name === 'NotFoundError') {
                msg = "No microphone found.";
            }

            if (mountedRef.current) {
                setPermissionError(msg);
                setIsConnected(false);
            }
            cleanup();
        } finally {
            isStartingRef.current = false;
        }
    };

    useEffect(() => {
        if (step === 'live') {
            startCall();
        }

        return () => {
            cleanup();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step]);

    const endCall = () => {
        cleanup();
        addTicket(); // Add a ticket when the call ends
        setGiveawayMode('participating');
        setViewState(ViewState.GIVEAWAY_FORM);
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
                            {t.callContext}
                        </h2>
                    </div>

                    {/* Form Container (Glassmorphism) */}
                    <div
                        className="absolute z-10 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-xl overflow-y-auto no-scrollbar"
                        style={{ left: '5.3%', top: '12%', width: '89.3%', height: '82%' }}
                    >
                        <div className="p-5 space-y-3">
                            {/* Persona Icon */}
                            <div className="flex flex-col items-center mb-2">
                                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30 shadow-lg overflow-hidden">
                                    <img
                                        src={initialPersona === 'grinch' ? "/images/grinch.jpg" :
                                            initialPersona === 'spicy_santa' ? "/images/spicy-santa.jpg" :
                                                "/images/santa.jpg"}
                                        className="w-full h-full object-cover"
                                        alt="Persona"
                                    />
                                </div>
                                <p className="text-white/80 font-bold text-xs mt-1 uppercase tracking-wide">{t.calling}:</p>
                                <h3 className="text-lg font-christmas text-white">
                                    {initialPersona === 'grinch' ? "The Grinch" :
                                        initialPersona === 'spicy_santa' ? "Spicy Santa" : "Santa Claus"}
                                </h3>
                            </div>

                            {/* Name Input */}
                            <div>
                                <label className="block text-white font-bold text-xs mb-1">{t.whoFor}</label>
                                <input
                                    className="w-full bg-white/80 border border-white/30 rounded-xl px-3 py-2.5 text-slate-800 placeholder-slate-500 focus:ring-2 focus:ring-blue-400 focus:outline-none shadow-inner text-sm"
                                    value={formData.recipientName}
                                    onChange={e => setFormData({ ...formData, recipientName: e.target.value })}
                                />
                            </div>

                            {/* Email Input */}
                            <div>
                                <label className="block text-white font-bold text-xs mb-1">{t.email}</label>
                                <input
                                    type="email"
                                    className="w-full bg-white/80 border border-white/30 rounded-xl px-3 py-2.5 text-slate-800 placeholder-slate-500 focus:ring-2 focus:ring-blue-400 focus:outline-none shadow-inner text-sm"
                                    value={formData.email || ''}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="email@example.com"
                                />
                            </div>

                            {/* Age & Behavior */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-white font-bold text-xs mb-1">{t.age}</label>
                                    <input
                                        className="w-full bg-white/80 border border-white/30 rounded-xl px-3 py-2.5 text-slate-800 placeholder-slate-500 focus:ring-2 focus:ring-blue-400 focus:outline-none shadow-inner text-sm"
                                        value={formData.age}
                                        onChange={e => setFormData({ ...formData, age: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-white font-bold text-xs mb-1">{t.behavior}</label>
                                    <select
                                        className="w-full bg-white/80 border border-white/30 rounded-xl px-2 py-2.5 text-slate-800 focus:ring-2 focus:ring-blue-400 focus:outline-none shadow-inner text-sm appearance-none"
                                        value={formData.behavior}
                                        onChange={e => setFormData({ ...formData, behavior: e.target.value as any })}
                                    >
                                        <option>Muy bien</option>
                                        <option>Bien</option>
                                        <option>Regular</option>
                                        <option>Travieso</option>
                                    </select>
                                </div>
                            </div>

                            {/* Gifts */}
                            <div>
                                <label className="block text-white font-bold text-xs mb-1">{t.gifts}</label>
                                <input
                                    className="w-full bg-white/80 border border-white/30 rounded-xl px-3 py-2.5 text-slate-800 placeholder-slate-500 focus:ring-2 focus:ring-blue-400 focus:outline-none shadow-inner text-sm"
                                    value={formData.gifts}
                                    onChange={e => setFormData({ ...formData, gifts: e.target.value })}
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-white font-bold text-xs mb-1">{t.notes}</label>
                                <textarea
                                    className="w-full bg-white/80 border border-white/30 rounded-xl px-3 py-2.5 text-slate-800 placeholder-slate-500 focus:ring-2 focus:ring-blue-400 focus:outline-none shadow-inner resize-none h-16 text-sm"
                                    value={formData.details}
                                    placeholder={t.notesPlaceholder}
                                    onChange={e => setFormData({ ...formData, details: e.target.value })}
                                />
                            </div>

                            {/* Start Call Button */}
                            <button
                                onClick={() => setStep('live')}
                                className="w-full bg-green-600 hover:bg-green-500 py-3.5 rounded-xl font-bold text-white shadow-lg transition active:scale-95 border-2 border-green-400 mt-2"
                            >
                                {t.startCall}
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        );
    }

    // LIVE CALL VIEW
    return (
        <div className="relative h-full bg-slate-900 flex flex-col z-50">
            {/* Background Glow Effect */}
            <div className={`absolute inset-0 opacity-30 bg-gradient-to-b ${initialPersona === 'grinch' ? 'from-green-900 to-slate-900' :
                initialPersona === 'spicy_santa' ? 'from-red-900 to-slate-900' :
                    'from-blue-900 to-slate-900'
                }`}></div>

            {/* Error Overlay */}
            {permissionError ? (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/95 p-8 text-center">
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                        <AlertCircle size={40} className="text-red-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Access Required</h3>
                    <p className="text-slate-300 mb-8">{permissionError}</p>
                    <button
                        onClick={() => { setStep('setup'); setPermissionError(null); }}
                        className="bg-white text-slate-900 px-8 py-3 rounded-xl font-bold hover:bg-slate-100 transition"
                    >
                        Go Back & Retry
                    </button>
                </div>
            ) : (
                <>
                    <div className="relative z-30 flex-1 flex flex-col justify-between p-6">
                        {/* Top Space */}
                        <div className="pt-10 flex justify-center">
                            <div className="text-slate-400 text-sm font-medium tracking-widest uppercase opacity-60">
                                {t.videoAudio}
                            </div>
                        </div>

                        {/* Main Caller Info */}
                        <div className="flex flex-col items-center justify-center -mt-10">
                            <div className={`w-48 h-48 rounded-full p-1 mb-8 shadow-[0_0_60px_rgba(255,255,255,0.1)] ${isConnected ? 'animate-pulse-slow' : 'scale-100'
                                }`}>
                                <div className="w-full h-full rounded-full overflow-hidden border-4 border-white/10 relative bg-slate-800">
                                    <img
                                        src={initialPersona === 'grinch' ? "/images/grinch.jpg" :
                                            initialPersona === 'spicy_santa' ? "/images/spicy-santa.jpg" :
                                                "/images/santa.jpg"}
                                        className="w-full h-full object-cover"
                                        alt="Persona"
                                    />
                                </div>
                            </div>

                            <h2 className="text-4xl font-bold text-white font-christmas drop-shadow-xl text-center mb-2">
                                {initialPersona === 'grinch' ? 'The Grinch' :
                                    initialPersona === 'spicy_santa' ? 'Spicy Santa' : 'Santa Claus'}
                            </h2>

                            {/* Status / Timer */}
                            {isConnected ? (
                                <div className="text-white/90 text-2xl font-mono font-medium tracking-widest">
                                    {formatTime(callDuration)}
                                </div>
                            ) : (
                                <div className="text-white/60 text-lg animate-pulse font-medium">
                                    Conectando...
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="flex justify-center gap-8 pb-12">
                            <button
                                onClick={() => setIsMuted(!isMuted)}
                                className={`p-6 rounded-full transition-all duration-300 transform hover:scale-105 ${isMuted
                                    ? 'bg-white text-slate-900 shadow-lg'
                                    : 'bg-white/10 text-white backdrop-blur-md border border-white/10 hover:bg-white/20'
                                    }`}
                            >
                                {isMuted ? <MicOff size={32} /> : <Mic size={32} />}
                            </button>

                            <button
                                onClick={endCall}
                                className="p-6 rounded-full bg-red-600 text-white shadow-[0_10px_40px_rgba(220,38,38,0.4)] transform hover:scale-110 transition duration-300 border-4 border-red-500 hover:bg-red-500"
                            >
                                <PhoneOff size={36} fill="currentColor" />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default CallView;