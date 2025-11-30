import React, { useState } from 'react';
import { ViewState, Language } from '../types';
import { translations } from '../services/translations';

interface Props {
    setViewState: (view: ViewState) => void;
    language: Language;
    setLanguage: (lang: Language) => void;
}

const SplashView: React.FC<Props> = ({ setViewState, language, setLanguage }) => {
    const t = translations[language];
    const [showLanguageSelector, setShowLanguageSelector] = useState(false);

    return (
        <div className="relative h-full w-full overflow-hidden">

            {/* FONDO NAVIDEÑO */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center"
                style={{
                    backgroundImage: 'url("/images/splash-bg.jpg")',
                }}
            />

            {/* EFECTO DE NIEVE CAYENDO */}
            <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
                {[...Array(50)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full bg-white opacity-70"
                        style={{
                            width: `${Math.random() * 4 + 2}px`,
                            height: `${Math.random() * 4 + 2}px`,
                            left: `${Math.random() * 100}%`,
                            animation: `snowfall ${Math.random() * 3 + 7}s linear infinite`,
                            animationDelay: `${Math.random() * 5}s`,
                        }}
                    />
                ))}
            </div>

            {/* CONTENEDOR PRINCIPAL CON VIEWPORT MÓVIL */}
            <div className="absolute inset-0 z-20 flex items-center justify-center">
                {/* Canvas responsivo basado en viewport móvil 375x667 */}
                <div
                    className="relative w-full h-full max-w-md mx-auto"
                    style={{
                        maxHeight: '100vh',
                        aspectRatio: '375/667'
                    }}
                >
                    {/* TÍTULO - Z:5 */}
                    <div
                        className="absolute"
                        style={{
                            left: '2.93%',
                            top: '7.5%',
                            width: '94.67%',
                            zIndex: 5
                        }}
                    >
                        <img
                            src="/images/title.png"
                            alt="Naughty or Nice Call Santa"
                            className="w-full h-auto"
                            style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}
                        />
                    </div>

                    {/* LOGO SANTA/GRINCH - Z:4 */}
                    <div
                        className="absolute"
                        style={{
                            left: '2.67%',
                            top: '22.79%',
                            width: '95.73%',
                            zIndex: 4
                        }}
                    >
                        <img
                            src="/images/logo.png"
                            alt="Santa and Grinch"
                            className="w-full h-auto"
                            style={{ filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.4))' }}
                        />
                    </div>

                    {/* MARCO DORADO - Z:1 */}
                    <div
                        className="absolute"
                        style={{
                            left: '10.93%',
                            top: '40.03%',
                            width: '80%',
                            zIndex: 1
                        }}
                    >
                        <img
                            src="/images/panel-frame.png"
                            alt="Frame"
                            className="w-full h-auto"
                        />
                    </div>

                    {/* BOTÓN SELECCIONAR IDIOMA - Z:3 */}
                    <div
                        className="absolute"
                        style={{
                            left: '31.2%',
                            top: '56%',
                            width: '40.53%',
                            zIndex: 3
                        }}
                    >
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowLanguageSelector(!showLanguageSelector);
                                }}
                                className="w-full transform transition hover:scale-105 active:scale-95"
                                style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}
                            >
                                <img
                                    src="/images/btn-seleccionar-idioma.png"
                                    alt="Seleccionar Idioma"
                                    className="w-full h-auto"
                                />
                            </button>

                            {/* Persiana de idiomas - ABAJO */}
                            {showLanguageSelector && (
                                <div className="absolute top-full mt-2 left-0 right-0 z-50">
                                    <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-2 space-y-1.5 shadow-2xl">
                                        {Object.values(Language).map((lang) => (
                                            <button
                                                key={lang}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setLanguage(lang);
                                                    setShowLanguageSelector(false);
                                                }}
                                                className={`w-full py-2 px-3 rounded-xl font-bold transition-all text-xs shadow-md ${language === lang
                                                    ? 'bg-red-700 text-white scale-[1.02]'
                                                    : 'bg-red-600 text-white/90 hover:bg-red-700 hover:scale-[1.01]'
                                                    }`}
                                                style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}
                                            >
                                                {lang}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* TEXTO DEL IDIOMA SELECCIONADO - Z:4 */}
                    <div
                        className="absolute"
                        style={{
                            left: '42.4%',
                            top: '60.5%',
                            width: '18.67%',
                            zIndex: 4
                        }}
                    >
                        <div className="text-white font-bold text-xs uppercase tracking-wider text-center"
                            style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
                        >
                            {language}
                        </div>
                    </div>

                    {/* BOTÓN COMENZAR - Z:2 */}
                    <div
                        className="absolute"
                        style={{
                            left: '25.87%',
                            top: '63%',
                            width: '52.27%',
                            zIndex: 2
                        }}
                    >
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setViewState(ViewState.DASHBOARD);
                            }}
                            className="w-full transform transition hover:scale-105 active:scale-95"
                            style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}
                        >
                            <img
                                src="/images/btn-comenzar.png"
                                alt="Comenzar"
                                className="w-full h-auto"
                            />
                        </button>
                    </div>
                </div>
            </div>

            {/* CSS para animación de nieve */}
            <style>{`
                @keyframes snowfall {
                    0% {
                        transform: translateY(-10vh) rotate(0deg);
                        opacity: 0.7;
                    }
                    100% {
                        transform: translateY(110vh) rotate(360deg);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
};

export default SplashView;