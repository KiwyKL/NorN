
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Wand2, Image as ImageIcon, Play, Send, Upload, Smartphone, CheckCircle, Gift, Ticket, Mail, Download } from 'lucide-react';
import { ViewState, Language } from '../types';
import { translations } from '../services/translations';
import { generateChristmasImage, analyzeLetterImage, editImageWithPrompt } from '../services/geminiService';
import { blobToBase64 } from '../services/geminiUtils';
import { countries } from '../constants/countries';
import { submitLead } from '../services/leadService';

interface Props {
    setViewState: (view: ViewState) => void;
    language: Language;
}

// Countries imported from shared constants

const LetterView: React.FC<Props> = ({ setViewState, language }) => {
    const t = translations[language];

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState(''); // New mandatory field
    const [country, setCountry] = useState('');
    const [age, setAge] = useState('');
    const [message, setMessage] = useState('');

    // Logic State
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isSent, setIsSent] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);

    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const validateForm = () => {
        if (!name.trim() || !email.trim()) {
            setValidationError("Please enter Name and Email / Por favor ingresa Nombre y Email");
            return false;
        }
        setValidationError(null);
        return true;
    };

    const handleSendLetter = async () => {
        if (!validateForm()) return;
        if (!message.trim()) {
            setValidationError("Please write a message / Escribe un mensaje");
            return;
        }

        setLoading(true);

        // 1. Simulate Sending Delay
        await new Promise(resolve => setTimeout(resolve, 3000));
        if (!mountedRef.current) return;

        // 2. Generate the "Santa Holding Letter" image (Text based generation)
        try {
            // Combine fields into a text that should appear on the letter
            const letterContent = `Name: ${name}\nFrom: ${country}, Age: ${age}\nWishes: ${message}`;

            console.log('📧 Generating letter image...');
            const base64 = await generateChristmasImage(letterContent);
            console.log('✅ Image generated successfully');

            if (mountedRef.current) {
                setImage(base64);
                setIsSent(true);
                // Submit Lead
                submitLead({
                    name,
                    email,
                    country,
                    source: 'letter',
                    timestamp: new Date().toISOString(),
                    metadata: { age, message }
                });
            }
        } catch (e: any) {
            console.error('❌ Letter sending error:', e);
            console.error('Error message:', e.message);
            console.error('Error stack:', e.stack);

            // Show detailed error to user for debugging
            const errorDetails = `
ERROR COMPLETO (copia esto):
━━━━━━━━━━━━━━━━━━━━━━━━
Tipo: ${e.name || 'Error'}
Mensaje: ${e.message || 'Sin mensaje'}
Detalles: ${JSON.stringify(e, null, 2)}
━━━━━━━━━━━━━━━━━━━━━━━━

Por favor envía este error completo al desarrollador.
            `.trim();

            alert(errorDetails);
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!validateForm()) {
            // Reset file input so change event fires again if they retry
            e.target.value = '';
            return;
        }

        setLoading(true); // Show sending immediately

        try {
            const base64 = await blobToBase64(file);

            // 1. Simulate Sending
            await new Promise(resolve => setTimeout(resolve, 2000));
            if (!mountedRef.current) return;

            // 2. Generate Santa holding THIS specific uploaded letter
            const santaWithLetterImg = await editImageWithPrompt(
                base64,
                "Create a professional square photo (1:1 aspect ratio) of Santa Claus proudly showing and holding this letter. Santa should be facing the camera with a warm, genuine smile. He is holding the letter up with both hands to display it clearly to the viewer. His full face, red hat, and white beard are completely visible - do not crop his head. The letter is positioned prominently in the frame but doesn't block Santa's friendly face. Background: cozy North Pole workshop with warm Christmas lighting. The image should fill the entire square frame."
            );

            if (mountedRef.current) {
                setImage(santaWithLetterImg);
                setIsSent(true);
                // Submit Lead
                submitLead({
                    name,
                    email,
                    country,
                    source: 'letter',
                    timestamp: new Date().toISOString(),
                    metadata: { type: 'upload' }
                });
            }
        } catch (err) {
            console.error("Error processing uploaded letter:", err);
            // Fallback
            try {
                const santaImg = await generateChristmasImage("Santa Claus holding a received letter");
                if (mountedRef.current) {
                    setImage(santaImg);
                    setIsSent(true);
                }
            } catch (e) {
                console.error("Fallback failed", e);
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    const [isReading, setIsReading] = useState(false);

    const handleReadAloud = async () => {
        if (!message && !analysis) return;
        if (isReading) return;

        setIsReading(true);

        try {
            const textToRead = message || analysis || '';

            // Try to use Web Speech API (works on some Android devices)
            if ('speechSynthesis' in window) {
                // Cancel any ongoing speech
                window.speechSynthesis.cancel();

                // Wait for voices to load
                const loadVoices = () => {
                    return new Promise<SpeechSynthesisVoice[]>((resolve) => {
                        let voices = window.speechSynthesis.getVoices();
                        if (voices.length > 0) {
                            resolve(voices);
                        } else {
                            window.speechSynthesis.addEventListener('voiceschanged', () => {
                                voices = window.speechSynthesis.getVoices();
                                resolve(voices);
                            }, { once: true });
                            // Fallback after 1 second
                            setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
                        }
                    });
                };

                const voices = await loadVoices();
                console.log('Available voices:', voices.length);

                const utterance = new SpeechSynthesisUtterance(textToRead);

                // Try to find Spanish voice
                const spanishVoice = voices.find(v => v.lang.startsWith('es'));
                if (spanishVoice) {
                    utterance.voice = spanishVoice;
                }

                utterance.lang = language === 'Spanish' ? 'es-ES' : 'en-US';
                utterance.rate = 0.9;
                utterance.pitch = 0.8;
                utterance.volume = 1.0;

                utterance.onend = () => {
                    setIsReading(false);
                };

                utterance.onerror = (e) => {
                    console.error('Speech error:', e);
                    setIsReading(false);
                    // Fallback: show text
                    alert(`${language === 'Spanish' ? 'Carta' : 'Letter'}:\n\n${textToRead}`);
                };

                window.speechSynthesis.speak(utterance);
            } else {
                // No speech synthesis support - show text
                setIsReading(false);
                alert(`${language === 'Spanish' ? 'Carta' : 'Letter'}:\n\n${textToRead}`);
            }
        } catch (e) {
            console.error('TTS Error:', e);
            setIsReading(false);
            alert(`${language === 'Spanish' ? 'Carta' : 'Letter'}:\n\n${textToRead || ''}`);
        }
    };

    const handleDownload = () => {
        if (!image) return;

        try {
            // On Android, we need to open the image in a new tab for user to long-press and save
            const imageFormat = 'png';
            const dataUrl = `data:image/${imageFormat};base64,${image}`;

            // Try different approaches for Android compatibility
            if (navigator.userAgent.includes('Android')) {
                // Android: Open in new window so user can save
                const win = window.open();
                if (win) {
                    win.document.write(`<img src="${dataUrl}" style="width:100%;height:auto;" />`);
                    win.document.title = `Santa Letter ${Date.now()}`;
                } else {
                    // Fallback: try direct download
                    const link = document.createElement('a');
                    link.href = dataUrl;
                    link.download = `santa_letter_${Date.now()}.${imageFormat}`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            } else {
                // Desktop/iOS: Direct download
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = `santa_letter_${Date.now()}.${imageFormat}`;
                document.body.appendChild(link);
                link.click();
                setTimeout(() => document.body.removeChild(link), 100);
            }
        } catch (error) {
            console.error('Error downloading image:', error);
            alert(language === 'Spanish'
                ? 'Error al descargar. Intenta hacer captura de pantalla de la imagen.'
                : 'Download error. Try taking a screenshot instead.');
        }
    };

    // LOADING OVERLAY (SENDING...)
    if (loading) {
        return (
            <div className="relative h-full w-full flex flex-col">
                <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url("/images/dashboard-bg.jpg")' }} />
                <div className="relative z-10 h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-32 h-32 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-8 relative border-2 border-white/30 shadow-xl">
                        <div className="absolute inset-0 border-4 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                        <Send size={48} className="text-white animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-bold text-white font-christmas mb-4 animate-pulse drop-shadow-lg" style={{ textShadow: '0 2px 4px black' }}>
                        {t.sendingMessage}
                    </h2>
                    <p className="text-white/80 drop-shadow">North Pole Post Service</p>
                </div>
            </div>
        );
    }

    // SUCCESS VIEW (SANTA HOLDING LETTER)
    if (isSent && image) {
        return (
            <div className="relative h-full w-full flex flex-col">
                <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url("/images/dashboard-bg.jpg")' }} />

                <div className="relative z-10 h-full w-full max-w-[375px] mx-auto overflow-hidden">
                    {/* Back Button */}
                    <div onClick={() => setViewState(ViewState.DASHBOARD)} className="absolute cursor-pointer z-20 flex items-center justify-center bg-white/20 rounded-full backdrop-blur-sm hover:bg-white/30 transition" style={{ left: '5.3%', top: '3%', width: '40px', height: '40px' }}>
                        <ArrowLeft className="text-white" />
                    </div>

                    {/* Title */}
                    <div className="absolute z-20 flex items-center" style={{ left: '21.3%', top: '3.7%', width: '200px', height: '30px' }}>
                        <h2 className="text-white text-2xl font-bold font-christmas drop-shadow-lg" style={{ textShadow: '0 2px 4px black' }}>{t.sentSuccess}</h2>
                    </div>

                    {/* Content Container */}
                    <div className="absolute z-10 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-xl overflow-y-auto no-scrollbar" style={{ left: '5.3%', top: '12%', width: '89.3%', height: '75%' }}>
                        <div className="p-6 flex flex-col">
                            {/* Santa Image */}
                            <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-xl border-2 border-white/30 mb-4 relative bg-white/10 shrink-0">
                                <img src={`data:image/jpeg;base64,${image}`} className="w-full h-full object-contain" alt="Santa with Letter" />
                                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/70 to-transparent p-3">
                                    <p className="text-white font-bold text-sm drop-shadow">Proof of Delivery</p>
                                </div>
                            </div>

                            {/* Download Button */}
                            <button onClick={handleDownload} className="w-full bg-white/80 text-blue-700 hover:bg-white font-bold py-3 rounded-xl mb-4 flex items-center justify-center gap-2 transition active:scale-95 shadow-lg">
                                <Download size={20} /> {t.downloadPhoto}
                            </button>

                            {/* Success Message */}
                            <div className="bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-xl p-4 text-center w-full mb-4">
                                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2 border border-green-400/30">
                                    <Mail size={24} className="text-green-300" />
                                </div>
                                <h3 className="font-bold text-white text-lg mb-1">Saved!</h3>
                                <p className="text-white/80 text-sm leading-tight">
                                    Santa has filed your letter. We sent a copy to <b>{email}</b>.
                                </p>
                            </div>

                            {/* Another Letter Button */}
                            <button onClick={() => { setIsSent(false); setImage(null); setMessage(''); }} className="w-full bg-white/20 border-2 border-white/30 text-white hover:bg-white/30 font-bold py-3.5 rounded-xl shadow-lg transition active:scale-95 backdrop-blur-sm">
                                Write Another Letter
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // FORM VIEW
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
                        {t.writeTitle}
                    </h2>
                </div>

                {/* Form Container (Glassmorphism) */}
                <div
                    className="absolute z-10 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-xl"
                    style={{ left: '5.3%', top: '12%', width: '89.3%', height: '75%' }}
                />

                {/* Name Input */}
                <div className="absolute z-20" style={{ left: '10.6%', top: '21%', width: '78.7%', height: '45px' }}>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full h-full bg-white/80 border border-white/30 rounded-xl px-4 text-slate-800 placeholder-slate-500 focus:ring-2 focus:ring-blue-400 focus:outline-none shadow-inner"
                        placeholder={t.fullName}
                    />
                </div>

                {/* Email Input */}
                <div className="absolute z-20" style={{ left: '10.6%', top: '29.2%', width: '78.7%', height: '45px' }}>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-full bg-white/80 border border-white/30 rounded-xl px-4 text-slate-800 placeholder-slate-500 focus:ring-2 focus:ring-blue-400 focus:outline-none shadow-inner"
                        placeholder={t.email + " (Required)"}
                    />
                </div>

                {/* Country Select */}
                <div className="absolute z-20" style={{ left: '10.6%', top: '37.5%', width: '37.3%', height: '45px' }}>
                    <select
                        className="w-full h-full bg-white/80 border border-white/30 rounded-xl px-2 text-slate-800 focus:ring-2 focus:ring-blue-400 focus:outline-none appearance-none text-sm shadow-inner"
                        value={country}
                        onChange={e => setCountry(e.target.value)}
                    >
                        <option value="" disabled>Country...</option>
                        {countries.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                {/* Age Input */}
                <div className="absolute z-20" style={{ left: '52%', top: '37.5%', width: '37.3%', height: '45px' }}>
                    <input
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full h-full bg-white/80 border border-white/30 rounded-xl px-4 text-slate-800 placeholder-slate-500 focus:ring-2 focus:ring-blue-400 focus:outline-none shadow-inner"
                        placeholder={t.letterFormAge}
                    />
                </div>

                {/* Message Textarea */}
                <div className="absolute z-20" style={{ left: '10.6%', top: '49.5%', width: '78.7%', height: '18%' }}>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={t.letterPlaceholder}
                        className="w-full h-full bg-white/80 rounded-xl p-4 text-slate-800 placeholder-slate-500 focus:ring-2 focus:ring-blue-400 focus:outline-none border border-white/30 shadow-inner resize-none"
                    />
                </div>

                {/* Send Button - Full Width */}
                <div
                    onClick={handleSendLetter}
                    className="absolute z-20 cursor-pointer flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg transition active:scale-95 border-2 border-red-400"
                    style={{ left: '10.6%', top: '70.5%', width: '78.7%', height: '50px' }}
                >
                    <Send size={20} /> {t.sendToSanta}
                </div>

                {/* Upload Button */}
                <label
                    className={`absolute z-20 cursor-pointer flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition active:scale-95 border-2 border-blue-400 ${(!name || !email) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    style={{ left: '10.6%', top: '81%', width: '78.7%', height: '50px' }}
                    onClick={(e) => {
                        if (!name || !email) {
                            e.preventDefault();
                            setValidationError("Please enter Name and Email first / Ingresa Nombre y Email primero");
                        }
                    }}
                >
                    <Upload size={20} /> {t.upload}
                    <input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept="image/*"
                        disabled={!name || !email}
                    />
                </label>

                {/* Validation Error Toast */}
                {validationError && (
                    <div className="absolute z-50 top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full shadow-xl text-xs font-bold animate-bounce whitespace-nowrap">
                        {validationError}
                    </div>
                )}

            </div>
        </div>
    );
};

export default LetterView;
