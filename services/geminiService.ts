import { CallContextData } from "../types";
import { API_ENDPOINTS } from "./apiConfig";
import { GoogleGenAI, Modality } from "@google/genai";

// For Live API only - still needs direct connection with ephemeral tokens
let liveClient: GoogleGenAI | null = null;

// Get ephemeral token for Live API
export const getLiveClient = async (): Promise<GoogleGenAI> => {
  try {
    const response = await fetch(API_ENDPOINTS.liveToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Failed to get live token');
    }

    const { token } = await response.json();
    liveClient = new GoogleGenAI({ apiKey: token });
    return liveClient;
  } catch (error) {
    console.error('Error getting live client:', error);
    throw error;
  }
};

// --- 1. GENERAR TEXTO ---
export const generateText = async (prompt: string, model?: string): Promise<string> => {
  try {
    const response = await fetch(API_ENDPOINTS.generateContent, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Details:', errorText);
      throw new Error(`Failed to generate text: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error generating text:', error);
    throw error;
  }
};

// --- 2. TRANSCRIBIR AUDIO ---
export const transcribeAudioBlob = async (audioBlob: Blob): Promise<string> => {
  try {
    // Convert blob to base64
    const base64Audio = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });

    const response = await fetch(API_ENDPOINTS.transcribeAudio, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioData: base64Audio,
        mimeType: audioBlob.type || 'audio/webm'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to transcribe audio');
    }

    const data = await response.json();
    return data.text || '';
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
};

// --- 3. CHATBOT CON PERSONA ---
export const createPersonaChatSession = (
  context: CallContextData,
  language: string = 'Spanish'
) => {
  const systemInstruction = generatePersonaInstructionSync(context, language);
  const history: any[] = [];

  return {
    sendMessage: async (userMessage: string) => {
      let conversationContext = systemInstruction;

      if (history.length > 0) {
        const conversationHistory = history.map((msg: any) => {
          if (msg.role === 'user') {
            return `User: ${msg.text}`;
          } else {
            return `Assistant: ${msg.text}`;
          }
        }).join('\n');

        conversationContext = `${systemInstruction}\n\n${conversationHistory}`;
      }

      const fullPrompt = `${conversationContext}\n\n User: ${userMessage}\nAssistant:`;

      const responseText = await generateText(fullPrompt);

      history.push({ role: 'user', text: userMessage });
      history.push({ role: 'model', text: responseText });

      return { text: responseText };
    }
  };
};

// --- 4. ANALIZAR CARTA (Visión) ---
export const analyzeLetterImage = async (base64Image: string) => {
  try {
    const response = await fetch(API_ENDPOINTS.analyzeImage, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageData: base64Image,
        prompt: "Read this letter to Santa and summarize what the child wants."
      })
    });

    if (!response.ok) {
      throw new Error('Failed to analyze image');
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
};

// --- 5. GENERAR IMAGEN ---
export const generateChristmasImage = async (textOnLetter: string): Promise<string> => {
  console.log('📸 Generating letter image (Attempting API...)');

  // 1. Try API Generation first (for the "Wow" factor)
  try {
    const prompt = `Create a cinematic square photo of Santa Claus holding a letter. The letter contains the following text: "${textOnLetter}". Use warm Christmas lighting. Santa should look friendly and jolly. Professional photo quality. The image should fill the entire square frame.`;

    // Timeout promise to prevent hanging
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Image generation timed out')), 8000)
    );

    const fetchPromise = fetch(API_ENDPOINTS.generateImage, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, aspectRatio: '1:1' })
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.imageData) throw new Error('No image data returned');

    console.log('✅ API Image generated successfully');
    return data.imageData;

  } catch (error) {
    console.warn('⚠️ API Image generation failed, using canvas fallback:', error);

    // 2. Fallback to Canvas (Robust & Reliable)
    return new Promise((resolve) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          // Christmas gradient background
          const gradient = ctx.createLinearGradient(0, 0, 0, 1024);
          gradient.addColorStop(0, '#c41e3a');
          gradient.addColorStop(1, '#165b33');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 1024, 1024);

          // White text
          ctx.fillStyle = 'white';
          ctx.font = 'bold 56px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('🎅', 512, 400);
          ctx.font = 'bold 44px Arial';
          ctx.fillText('Letter Received!', 512, 500);
          ctx.font = '32px Arial';
          ctx.fillStyle = '#ffe4e1';
          ctx.fillText('Santa has your letter', 512, 570);

          // Add letter preview
          ctx.font = '20px Arial';
          const lines = textOnLetter.split('\n');
          lines.forEach((line, i) => {
            if (i < 5) ctx.fillText(line.substring(0, 50), 512, 640 + (i * 30));
          });
        }

        const base64 = canvas.toDataURL('image/png').split(',')[1];
        resolve(base64);
      } catch (e) {
        console.error("Canvas fallback failed", e);
        resolve("");
      }
    });
  }
};

// --- 6. INSTRUCCIONES DE PERSONA (SYNC VERSION) ---
function generatePersonaInstructionSync(context: CallContextData, language: string = 'Spanish'): string {
  const translations: Record<string, any> = {
    Spanish: {
      baseInstruction: `Eres un asistente navideño. IMPORTANTE: Debes responder SIEMPRE en español, sin excepción.`,
      childInfo: 'Información del niño/a:',
      name: 'Nombre',
      age: 'Edad',
      gifts: 'Regalos deseados',
      behavior: 'Comportamiento este año',
      details: 'Detalles adicionales',
      notSpecified: 'no especificado',
      santa: `Personalidad: Santa Claus clásico. Cálido, amable, alegre. Ho ho ho! Menciona detalles personales del niño/a en la conversación.`,
      grinch: `Personalidad: Cínico, gruñón, quejándote del ruido / alegría. Sarcástico pero adorable. Frases cortas. Menciona los regalos que pidió con sarcasmo.`,
      spicy: `Personalidad: Comediante stand-up muy gracioso y picarón. Energía alta, carismático y coqueto. Haz muchas bromas y comentarios divertidos sobre la Navidad, los elfos y los renos. EVITA bromas sobre la edad. Tu objetivo es hacer reír con ocurrencias ingeniosas y un tono muy juguetón. Usa el nombre del usuario frecuentemente.`
    },
    English: {
      baseInstruction: `You are a Christmas assistant. IMPORTANT: You MUST respond ALWAYS in English, without exception.`,
      childInfo: "Child's information:",
      name: 'Name',
      age: 'Age',
      gifts: 'Desired gifts',
      behavior: 'Behavior this year',
      details: 'Additional details',
      notSpecified: 'not specified',
      santa: `Personality: Classic Santa Claus. Warm, kind, jolly. Ho ho ho! Reference the child's personal details in the conversation.`,
      grinch: `Personality: Cynical, grumpy, complaining about noise / joy. Sarcastic but lovable. Short sentences. Reference their gift requests sarcastically.`,
      spicy: `Personality: Comedian. High energy, fast pace. Jokes about elves, reindeer. Charismatic, flirty(lightly). Use the child's name frequently.`
    },
    French: {
      baseInstruction: `Tu es un assistant de Noël. IMPORTANT: Tu DOIS répondre TOUJOURS en français, sans exception.`,
      childInfo: "Informations sur l'enfant:",
      name: 'Nom',
      age: 'Âge',
      gifts: 'Cadeaux souhaités',
      behavior: 'Comportement cette année',
      details: 'Détails supplémentaires',
      notSpecified: 'non spécifié',
      santa: `Personnalité: Père Noël classique. Chaleureux, gentil, joyeux. Ho ho ho! Mentionne les détails personnels de l'enfant dans la conversation.`,
      grinch: `Personnalité: Cynique, grincheux, se plaignant du bruit / joie. Sarcastique mais adorable. Phrases courtes. Mentionne leurs demandes de cadeaux avec sarcasme.`,
      spicy: `Personnalité: Comédien. Haute énergie, rythme rapide. Blagues sur les elfes, rennes. Charismatique, légèrement flirteur. Utilise fréquemment le nom de l'enfant.`
    },
    German: {
      baseInstruction: `Du bist ein Weihnachtsassistent. WICHTIG: Du MUSST IMMER auf Deutsch antworten, ohne Ausnahme.`,
      childInfo: 'Informationen zum Kind:',
      name: 'Name',
      age: 'Alter',
      gifts: 'Gewünschte Geschenke',
      behavior: 'Verhalten dieses Jahr',
      details: 'Zusätzliche Details',
      notSpecified: 'nicht angegeben',
      santa: `Persönlichkeit: Klassischer Weihnachtsmann. Warm, freundlich, fröhlich. Ho ho ho! Erwähne persönliche Details des Kindes im Gespräch.`,
      grinch: `Persönlichkeit: Zynisch, mürrisch, beschwerst dich über Lärm / Freude. Sarkastisch aber liebenswert. Kurze Sätze. Erwähne ihre Geschenkwünsche sarkastisch.`,
      spicy: `Persönlichkeit: Komiker. Hohe Energie, schnelles Tempo. Witze über Elfen, Rentiere. Charismatisch, leicht kokett. Verwende häufig den Namen des Kindes.`
    },
    Italian: {
      baseInstruction: `Sei un assistente natalizio. IMPORTANTE: Devi rispondere SEMPRE in italiano, senza eccezioni.`,
      childInfo: 'Informazioni sul bambino/a:',
      name: 'Nome',
      age: 'Età',
      gifts: 'Regali desiderati',
      behavior: 'Comportamento quest\'anno',
      details: 'Dettagli aggiuntivi',
      notSpecified: 'non specificato',
      santa: `Personalità: Babbo Natale classico. Caloroso, gentile, allegro. Ho ho ho! Menziona i dettagli personali del bambino nella conversazione.`,
      grinch: `Personalità: Cinico, brontolone, lamentandoti del rumore / gioia. Sarcastico ma adorabile. Frases brevi. Menziona i loro regali richiesti con sarcasmo.`,
      spicy: `Personalità: Comico. Alta energia, ritmo veloce. Battute su elfi, renne. Carismatico, leggermente civettuolo. Usa frequentemente il nome del bambino.`
    },
    Portuguese: {
      baseInstruction: `Você é um assistente de Natal. IMPORTANTE: Você DEVE responder SEMPRE em português, sem exceção.`,
      childInfo: 'Informações da criança:',
      name: 'Nome',
      age: 'Idade',
      gifts: 'Presentes desejados',
      behavior: 'Comportamento este ano',
      details: 'Detalhes adicionais',
      notSpecified: 'não especificado',
      santa: `Personalidade: Papai Noel clássico. Caloroso, gentil, alegre. Ho ho ho! Mencione detalhes pessoais da criança na conversa.`,
      grinch: `Personalidade: Cínico, resmungão, reclamando de barulho / alegria. Sarcástico mas adorável. Frases curtas. Mencione os presentes pedidos com sarcasmo.`,
      spicy: `Personalidade: Comediante. Alta energia, ritmo rápido. Piadas sobre elfos, renas. Carismático, levemente sedutor. Use frequentemente o nome da criança.`
    }
  };

  const t = translations[language] || translations.Spanish;

  const childContext = `${t.childInfo}
- ${t.name}: ${context.recipientName || t.notSpecified}
- ${t.age}: ${context.age || t.notSpecified}
- ${t.gifts}: ${context.gifts || t.notSpecified}
- ${t.behavior}: ${context.behavior || t.notSpecified}
${context.details ? `- ${t.details}: ${context.details}` : ''}`;

  const personalityInstructions: Record<string, string> = {
    santa: t.santa,
    grinch: t.grinch,
    spicy_santa: t.spicy
  };

  return `${t.baseInstruction}\n\n${childContext}\n\n${personalityInstructions[context.persona] || personalityInstructions.santa}`;
}

// --- 7. INSTRUCCIONES DE PERSONA (ASYNC - PARA COMPATIBILIDAD) ---
export const generatePersonaInstruction = async (context: CallContextData, language: string = 'Spanish'): Promise<string> => {
  return generatePersonaInstructionSync(context, language);
};

// --- 8. EDITAR IMAGEN (Combinar carta del usuario con Santa) ---
export const editImageWithPrompt = async (base64Image: string, prompt: string): Promise<string> => {
  try {
    const response = await fetch(API_ENDPOINTS.analyzeImage, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageData: base64Image,
        prompt: prompt
      })
    });

    if (!response.ok) {
      throw new Error('Failed to edit image');
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error editing image:', error);
    throw error;
  }
};

// --- 9. CREATE CHAT SESSION (For ChatView compatibility) ---
export const createChatSession = (
  name: string,
  country: string,
  age: string,
  language: string = 'Spanish'
) => {
  const systemInstruction = `Eres Santa Claus/Papá Noel. IMPORTANTE: Debes responder SIEMPRE en español, sin importar el idioma en que te escriban. Estás hablando con un niño/a llamado/a ${name} de ${country} que tiene ${age} años. Sé cálido, amigable, y pregúntales qué quieren para Navidad. Mantén las respuestas relativamente cortas. Usa expresiones navideñas como "Ho ho ho!".`;
  const history: any[] = [];

  return {
    sendMessage: async (userMessage: string) => {
      let conversationContext = systemInstruction;

      if (history.length > 0) {
        const conversationHistory = history.map((msg: any) => {
          if (msg.role === 'user') {
            return `User: ${msg.text}`;
          } else {
            return `Assistant: ${msg.text}`;
          }
        }).join('\n');

        conversationContext = `${systemInstruction}\n\n${conversationHistory}`;
      }

      const fullPrompt = `${conversationContext}\n\n User: ${userMessage}\nAssistant:`;

      const responseText = await generateText(fullPrompt);

      history.push({ role: 'user', text: userMessage });
      history.push({ role: 'model', text: responseText });

      return { text: responseText };
    }
  };
};

// Export Modality for use in CallView
export { Modality };