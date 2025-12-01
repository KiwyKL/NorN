export enum ViewState {
  SPLASH = 'SPLASH',
  DASHBOARD = 'DASHBOARD',
  LETTER = 'LETTER',
  CHAT = 'CHAT',
  CALL_SETUP = 'CALL_SETUP',
  LIVE_CALL = 'LIVE_CALL',
  ADVENT = 'ADVENT',
  WISHLIST = 'WISHLIST',
  GIVEAWAY_FORM = 'GIVEAWAY_FORM',
  STORE = 'STORE'
}

export enum Language {
  ES = 'Español',
  EN = 'English',
  FR = 'Français',
  DE = 'Deutsch',
  IT = 'Italiano',
  PT = 'Português'
}

export interface CallContextData {
  recipientName: string;
  age: string;
  gifts: string;
  behavior: 'Muy bien' | 'Bien' | 'Regular' | 'Travieso';
  details: string;
  persona: 'santa' | 'grinch' | 'spicy_santa';
  email?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}