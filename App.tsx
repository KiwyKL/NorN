import React, { useState } from 'react';
import { ViewState, Language } from './types';
import Snowfall from './components/Snowfall';
import BottomNav from './components/BottomNav';
import SplashView from './views/SplashView';
import DashboardView from './views/DashboardView';
import LetterView from './views/LetterView';
import ChatView from './views/ChatView';
import CallView from './views/CallView';
import AdventView from './views/AdventView';
import WishlistView from './views/WishlistView';
import GiveawayView from './views/GiveawayView';
import StoreView from './views/StoreView';

const App: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>(ViewState.SPLASH);
  const [language, setLanguage] = useState<Language>(Language.ES);
  const [selectedPersona, setSelectedPersona] = useState<'santa' | 'grinch' | 'spicy_santa'>('santa');
  const [giveawayMode, setGiveawayMode] = useState<'participating' | 'marketing'>('participating');

  // Tickets tracking - load from localStorage or default to 0
  const [tickets, setTickets] = useState<number>(() => {
    const saved = localStorage.getItem('giveawayTickets');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Save tickets to localStorage whenever they change
  React.useEffect(() => {
    localStorage.setItem('giveawayTickets', tickets.toString());
  }, [tickets]);

  // Function to add a ticket (called when user completes a call)
  const addTicket = () => {
    setTickets(prev => prev + 1);
  };

  const renderView = () => {
    switch (viewState) {
      case ViewState.SPLASH:
        return <SplashView setViewState={setViewState} language={language} setLanguage={setLanguage} />;
      case ViewState.DASHBOARD:
        return <DashboardView setViewState={setViewState} language={language} setPersona={setSelectedPersona} setGiveawayMode={setGiveawayMode} />;
      case ViewState.LETTER:
        return <LetterView setViewState={setViewState} language={language} />;
      case ViewState.CHAT:
        return <ChatView setViewState={setViewState} language={language} />;
      case ViewState.CALL_SETUP:
      case ViewState.LIVE_CALL:
        return <CallView setViewState={setViewState} language={language} initialPersona={selectedPersona} setGiveawayMode={setGiveawayMode} addTicket={addTicket} />;
      case ViewState.ADVENT:
        return <AdventView setViewState={setViewState} language={language} />;
      case ViewState.WISHLIST:
        return <WishlistView setViewState={setViewState} language={language} tickets={tickets} />;
      case ViewState.GIVEAWAY_FORM:
        return <GiveawayView setViewState={setViewState} language={language} mode={giveawayMode} />;
      case ViewState.STORE:
        return <StoreView setViewState={setViewState} language={language} />;
      default:
        return <DashboardView setViewState={setViewState} language={language} setPersona={setSelectedPersona} setGiveawayMode={setGiveawayMode} />;
    }
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden flex justify-center items-center font-sans">

      {/* Main Phone Container */}
      <div className="relative w-full h-full max-w-md bg-blue-950 shadow-2xl overflow-hidden flex flex-col">

        {/* Internal Snowfall (Inside the app screen only, excluding Splash which has its own) */}
        {viewState !== ViewState.SPLASH && <Snowfall />}

        {/* Content */}
        <div className="relative z-20 flex-1 h-full overflow-hidden">
          {renderView()}
        </div>
      </div>
    </div>
  );
};

export default App;