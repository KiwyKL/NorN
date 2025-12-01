import React from 'react';
import { ViewState, Language } from '../types';
import { Mail, MessageCircle, Phone, Calendar, Gift, Ticket, ShoppingBag } from 'lucide-react';
import { translations } from '../services/translations';

interface Props {
    setViewState: (view: ViewState) => void;
    language: Language;
    setPersona: (persona: 'santa' | 'grinch' | 'spicy_santa') => void;
    setGiveawayMode: (mode: 'participating' | 'marketing') => void;
}

const DashboardView: React.FC<Props> = ({ setViewState, language, setPersona, setGiveawayMode }) => {
    const t = translations[language];

    const handleCallClick = (persona: 'santa' | 'grinch' | 'spicy_santa') => {
        setPersona(persona);
        setViewState(ViewState.CALL_SETUP);
    };

    const handleGiveawayClick = () => {
        setGiveawayMode('marketing');
        setViewState(ViewState.GIVEAWAY_FORM);
    };

    return (
        <div className="relative h-full w-full flex flex-col">
            {/* Fondo del dashboard */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: 'url("/images/dashboard-bg.jpg")',
                }}
            />

            {/* Canvas contenedor centrado */}
            <div className="relative z-10 h-full w-full max-w-[375px] mx-auto overflow-visible">


                {/* Logo Santa */}
                <div
                    className="absolute"
                    style={{
                        left: '17.6%',
                        top: '14.8%',
                        width: '15.7%',
                        zIndex: 12,
                    }}
                >
                    <img src="/images/logo-santa.png" alt="Santa" className="w-full h-auto" />
                </div>

                {/* Logo Grinch */}
                <div
                    className="absolute"
                    style={{
                        left: '65.9%',
                        top: '15%',
                        width: '16%',
                        zIndex: 12,
                    }}
                >
                    <img src="/images/logo-grinch.png" alt="Grinch" className="w-full h-auto" />
                </div>

                {/* Título */}
                <div
                    className="absolute"
                    style={{
                        left: '4.5%',
                        top: '0%',
                        width: '88.8%',
                        zIndex: 10,
                    }}
                >
                    <img src="/images/dashboard-title.png" alt="Title" className="w-full h-auto" />
                </div>

                {/* Banner Giveaway */}
                <div
                    onClick={handleGiveawayClick}
                    className="absolute cursor-pointer transform transition hover:scale-105 active:scale-95"
                    style={{
                        left: '13.1%',
                        top: '25.6%',
                        width: '78.1%',
                        zIndex: 9,
                    }}
                >
                    <img src="/images/banner-giveaway.png" alt="Giveaway" className="w-full h-auto" />
                </div>

                {/* Texto Giveaway */}
                <div
                    className="absolute pointer-events-none overflow-hidden px-1 flex items-center justify-center"
                    style={{
                        left: '34.1%',
                        top: '29.5%',
                        width: '52%',
                        height: '3.3%',
                        zIndex: 15,
                    }}
                >
                    <p className="text-white text-[8px] leading-tight font-bold text-center drop-shadow-lg"
                        style={{
                            textShadow: '0 0 3px black',
                            whiteSpace: 'normal',
                            wordWrap: 'break-word',
                        }}>
                        {t.giveaway}
                    </p>
                </div>

                {/* Botón Carta */}
                <div
                    onClick={() => setViewState(ViewState.LETTER)}
                    className="absolute cursor-pointer transform transition active:scale-95"
                    style={{
                        left: '10.7%',
                        top: '37.8%',
                        width: '39.2%',
                        zIndex: 8,
                    }}
                >
                    <img src="/images/btn-letter.png" alt="Letter" className="w-full h-auto" />
                </div>

                {/* Texto Send Letter */}
                <div
                    className="absolute pointer-events-none overflow-hidden px-1"
                    style={{
                        left: '19.7%',
                        top: '44.5%',
                        width: '21.3%',
                        zIndex: 16,
                    }}
                >
                    <p className="text-white text-[11px] leading-tight font-bold text-center drop-shadow-lg overflow-hidden"
                        style={{
                            textShadow: '0 2px 4px black',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                        }}>
                        {t.sendLetter}
                    </p>
                </div>

                {/* Botón Chat */}
                <div
                    onClick={() => setViewState(ViewState.CHAT)}
                    className="absolute cursor-pointer transform transition active:scale-95"
                    style={{
                        left: '56.3%',
                        top: '37.9%',
                        width: '38.1%',
                        zIndex: 8,
                    }}
                >
                    <img src="/images/btn-chat.png" alt="Chat" className="w-full h-auto" />
                </div>

                {/* Texto Live Chat */}
                <div
                    className="absolute pointer-events-none overflow-hidden px-1"
                    style={{
                        left: '64.5%',
                        top: '46%',
                        width: '21.1%',
                        zIndex: 16,
                    }}
                >
                    <p className="text-white text-[11px] leading-tight font-bold text-center drop-shadow-lg overflow-hidden"
                        style={{
                            textShadow: '0 2px 4px black',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                        }}>
                        {t.liveChat}
                    </p>
                </div>

                {/* Título Live Call */}
                <div
                    className="absolute pointer-events-none"
                    style={{
                        left: '38%',
                        top: '54.1%',
                        width: '38%',
                        zIndex: 16,
                    }}
                >
                    <p className="text-white text-base font-bold drop-shadow-lg whitespace-nowrap"
                        style={{
                            textShadow: '0 2px 4px black',
                            WebkitTextStroke: '1px #FFD700'
                        }}>
                        {t.liveCall}
                    </p>
                </div>

                {/* Botón Santa */}
                <div
                    onClick={() => handleCallClick('santa')}
                    className="absolute cursor-pointer transform transition active:scale-95"
                    style={{
                        left: '2.7%',
                        top: '58.6%',
                        width: '33.3%',
                        zIndex: 7,
                    }}
                >
                    <img src="/images/btn-santa.png" alt="Santa" className="w-full h-auto" />
                </div>

                {/* Texto Call Santa */}
                <div
                    className="absolute pointer-events-none overflow-hidden px-1"
                    style={{
                        left: '7.5%',
                        top: '64.8%',
                        width: '24%',
                        zIndex: 16,
                    }}
                >
                    <p className="text-white text-[10px] leading-tight font-bold text-center drop-shadow-lg overflow-hidden"
                        style={{
                            textShadow: '0 2px 4px black',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                        }}>
                        {t.callSanta}
                    </p>
                </div>

                {/* Botón Grinch */}
                <div
                    onClick={() => handleCallClick('grinch')}
                    className="absolute cursor-pointer transform transition active:scale-95"
                    style={{
                        left: '34.9%',
                        top: '59.5%',
                        width: '33.1%',
                        zIndex: 6,
                    }}
                >
                    <img src="/images/btn-grinch.png" alt="Grinch" className="w-full h-auto" />
                </div>

                {/* Texto Prank Call */}
                <div
                    className="absolute pointer-events-none overflow-hidden px-1"
                    style={{
                        left: '39.7%',
                        top: '64.8%',
                        width: '24%',
                        zIndex: 16,
                    }}
                >
                    <p className="text-white text-[10px] leading-tight font-bold text-center drop-shadow-lg overflow-hidden"
                        style={{
                            textShadow: '0 2px 4px black',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                        }}>
                        {t.callGrinch}
                    </p>
                </div>

                {/* Botón Spicy */}
                <div
                    onClick={() => handleCallClick('spicy_santa')}
                    className="absolute cursor-pointer transform transition active:scale-95"
                    style={{
                        left: '66.7%',
                        top: '59.7%',
                        width: '33.3%',
                        zIndex: 5,
                    }}
                >
                    <img src="/images/btn-spicy-santa.png" alt="Spicy" className="w-full h-auto" />
                </div>

                {/* Texto Adults Only */}
                <div
                    className="absolute pointer-events-none overflow-hidden px-1"
                    style={{
                        left: '70.9%',
                        top: '65.1%',
                        width: '26.7%',
                        zIndex: 16,
                    }}
                >
                    <p className="text-white text-[10px] leading-tight font-bold text-center drop-shadow-lg overflow-hidden"
                        style={{
                            textShadow: '0 2px 4px black',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                        }}>
                        {t.adultsOnly}
                    </p>
                </div>

                {/* Barra de navegación */}
                <div
                    className="absolute"
                    style={{
                        left: '-5%',
                        top: '91.6%',
                        width: '110%',
                        height: '8.4%',
                        zIndex: 10,
                    }}
                >
                    <img src="/images/nav-bar.png" alt="Nav" className="w-full h-full object-cover transform scale-x-105" />
                </div>

                {/* Nav Home */}
                <div
                    onClick={() => setViewState(ViewState.SPLASH)}
                    className="absolute cursor-pointer transform transition active:scale-90"
                    style={{
                        left: '46.9%',
                        top: '93.3%',
                        width: '10.7%',
                        zIndex: 11,
                    }}
                >
                    <img src="/images/nav-home.png" alt="Home" className="w-full h-auto" />
                </div>

                {/* Wishlist */}
                <div
                    onClick={() => setViewState(ViewState.WISHLIST)}
                    className="relative bg-gradient-to-br from-yellow-500 to-orange-600 rounded-3xl shadow-2xl overflow-hidden cursor-pointer transition-all hover:scale-105 active:scale-95"
                    style={{ aspectRatio: '1' }}
                >
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                    <div className="relative z-10 h-full flex flex-col items-center justify-center p-6 text-white">
                        <Gift size={48} className="mb-3" />
                        <p className="font-bold text-lg text-center">{t.wishlist}</p>
                    </div>
                </div>

                {/* STORE - NEW */}
                <div
                    onClick={() => setViewState(ViewState.STORE)}
                    className="relative bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl shadow-2xl overflow-hidden cursor-pointer transition-all hover:scale-105 active:scale-95"
                    style={{ aspectRatio: '1' }}
                >
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                    <div className="relative z-10 h-full flex flex-col items-center justify-center p-6 text-white">
                        <ShoppingBag size={48} className="mb-3" />
                        <p className="font-bold text-lg text-center">{language === 'Spanish' ? 'Tienda' : 'Store'}</p>
                    </div>
                </div>

                {/* Giveaway */}
                <div
                    onClick={() => setViewState(ViewState.ADVENT)}
                    className="absolute cursor-pointer transform transition active:scale-90"
                    style={{
                        left: '76.8%',
                        top: '93.3%',
                        width: '13.1%',
                        zIndex: 11,
                    }}
                >
                    <img src="/images/nav-calendar.png" alt="Calendar" className="w-full h-auto" />
                </div>
            </div>
        </div>
    );
};

export default DashboardView;