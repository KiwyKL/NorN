import { GoogleGenAI, Modality } from "@google/genai";
import { CallContextData } from "../types";

// --- CONFIGURACIÓN ELEVENLABS ---
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || '';

export const ELEVENLABS_VOICE_IDS = {
  santa: import.meta.env.VITE_ELEVENLABS_VOICE_ID_SANTA || '',
  grinch: import.meta.env.VITE_ELEVENLABS_VOICE_ID_GRINCH || '',
  spicy_santa: import.meta.env.VITE_ELEVENLABS_VOICE_ID_SPICY || '',
} as const;

// --- CONFIGURACIÓN GEMINI (GOOGLE) ---
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("❌ ERROR CRÍTICO: No se encontró VITE_GEMINI_API_KEY en .env.local");
}

if (!ELEVENLABS_API_KEY) {
  console.warn("⚠️ ADVERTENCIA: No se encontró VITE_ELEVENLABS_API_KEY en .env.local");
}

// Inicializar cliente
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY || '' });

// --- 1.  TEXT-TO-SPEECH CON ELEVENLABS ---
export const generateElevenLabsAudio = async (
  text: string,
  voiceId: string,
  language: string = 'es'
): Promise<ArrayBuffer> => {
  if (!ELEVENLABS_API_KEY || !voiceId) {
    throw new Error("ElevenLabs API Key or Voice ID missing in .env.local");
  }

  const model_id = language === 'es' ? 'eleven_multilingual_v2' : 'eleven_turbo_v2_5';

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=3&output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text: text,
      model_id: model_id,
      voice_settings: {
        stability: 0.6,
        similarity_boost: 0.8,
        style: 0.2,
        use_speaker_boost: true
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API Error: ${response.status} - ${errorText}`);
  }

  return await response.arrayBuffer();
};

// --- 2. TRANSCRIPCIÓN DE AUDIO (BLOB) ---
export const transcribeAudioBlob = async (audioBlob: Blob): Promise<string> => {
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve, reject) => {
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
  });

  reader.readAsDataURL(audioBlob);
  const base64Audio = await base64Promise;

  const mimeType = audioBlob.type || 'audio/webm';

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Audio } },
          { text: "Transcribe this audio exactly. Return ONLY the transcribed text, nothing else." }
        ]
      }
    ]
  });

  return response.text || '';
};

// --- 3. CHATBOT CON PERSONA (Gemini 2.0 Flash) ---
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

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [
          {
            role: 'user',
            parts: [{ text: fullPrompt }]
          }
        ]
      });

      const responseText = response.text || '';

      history.push({ role: 'user', text: userMessage });
      history.push({ role: 'model', text: responseText });

      return { text: responseText };
    }
  };
};

// --- 4. ANALIZAR CARTA (Visión) ---
export const analyzeLetterImage = async (base64Image: string) => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { text: "Read this letter to Santa and summarize what the child wants." }
      ]
    }
  });
  return response.text;
};

// --- 5. GENERAR IMAGEN (Gemini 2.5 Flash Image - Nano Banana) ---
export const generateChristmasImage = async (textOnLetter: string): Promise<string> => {
  const prompt = `Create a cinematic square photo of Santa Claus holding a letter. The letter contains the following text: "${textOnLetter}". Use warm Christmas lighting. Santa should look friendly and jolly. Professional photo quality. The image should fill the entire square frame.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: prompt,
    config: {
      imageConfig: {
        aspectRatio: '1:1'
      }
    }
  });

  // Extract image from response
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return part.inlineData.data;
    }
  }

  throw new Error("No image generated in response");
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
      spicy: `Personality: Very funny and cheeky stand-up comedian. High energy, charismatic and flirtatious. Make many jokes and funny comments about Christmas, elves, and reindeer. AVOID jokes about age. Your goal is to make them laugh with witty remarks and a very playful tone. Use the user's name frequently.`
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
      spicy: `Personnalité: Comédien de stand-up très drôle et coquin. Haute énergie, charismatique et charmeur. Fais beaucoup de blagues et de commentaires drôles sur Noël, les lutins et les rennes. ÉVITE les blagues sur l'âge. Ton but est de faire rire avec des remarques spirituelles et un ton très enjoué. Utilise fréquemment le nom de l'utilisateur.`
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
      spicy: `Persönlichkeit: Sehr lustiger und frecher Stand-up-Comedian. Hohe Energie, charismatisch und kokett. Mache viele Witze und lustige Kommentare über Weihnachten, Elfen und Rentiere. VERMEIDE Witze über das Alter. Dein Ziel ist es, mit witzigen Bemerkungen und einem sehr verspielten Ton zum Lachen zu bringen. Verwende häufig den Namen des Benutzers.`
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
      grinch: `Personalità: Cinico, brontolone, lamentandoti del rumore / gioia. Sarcastico ma adorabile. Frasi brevi. Menziona i loro regali richiesti con sarcasmo.`,
      spicy: `Personalità: Comico stand-up molto divertente e sfacciato. Alta energia, carismatico e civettuolo. Fai molte battute e commenti divertenti su Natale, elfi e renne. EVITA battute sull'età. Il tuo obiettivo è far ridere con osservazioni argute e un tono molto giocoso. Usa frequentemente il nome dell'utente.`
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
      spicy: `Personalidade: Comediante stand-up muito engraçado e atrevido. Alta energia, carismático e sedutor. Faça muitas piadas e comentários engraçados sobre o Natal, elfos e renas. EVITE piadas sobre a idade. Seu objetivo é fazer rir com observações espirituosas e um tom muito brincalhão. Use frequentemente o nome do usuário.`
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

// --- 8. GENERAR SPEECH (Text-to-Speech) ---
export const generateSpeech = async (text: string, voiceId: string = ELEVENLABS_VOICE_IDS.santa, language: string = 'es'): Promise<ArrayBuffer> => {
  return await generateElevenLabsAudio(text, voiceId, language);
};

// --- 9. EDITAR IMAGEN (Combinar carta del usuario con Santa) ---
export const editImageWithPrompt = async (base64Image: string, prompt: string): Promise<string> => {
  // Use Gemini 2.5 Flash Image para editar/combinar la imagen
  const contents = [
    {
      text: prompt
    },
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image
      }
    }
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: contents,
    config: {
      imageConfig: {
        aspectRatio: '1:1'
      }
    }
  });

  // Extract image from response
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return part.inlineData.data;
    }
  }

  throw new Error("No image generated in response");
};

// --- 10. CHAT SESSION (TEXT ONLY) - NOW WITH MULTI-LANGUAGE SUPPORT ---
export const createChatSession = (name: string, country: string, age: string, language: string = 'Spanish') => {
  const languageInstructions: Record<string, string> = {
    Spanish: `Eres Santa Claus/Papá Noel. IMPORTANTE: Debes responder SIEMPRE en español, sin excepción. Estás hablando con un niño/a llamado/a ${name} de ${country} que tiene ${age} años. Sé cálido, amigable, y pregúntales qué quieren para Navidad. Mantén las respuestas relativamente cortas. Usa expresiones navideñas como "Ho ho ho!".`,
    English: `You are Santa Claus. IMPORTANT: You MUST respond ALWAYS in English, without exception. You are talking to a child named ${name} from ${country} who is ${age} years old. Be warm, friendly, and ask them what they want for Christmas. Keep responses relatively short. Use Christmas expressions like "Ho ho ho!".`,
    French: `Tu es le Père Noël. IMPORTANT: Tu DOIS répondre TOUJOURS en français, sans exception. Tu parles à un enfant nommé ${name} de ${country} qui a ${age} ans. Sois chaleureux, amical, et demande-lui ce qu'il veut pour Noël. Garde les réponses relativement courtes. Utilise des expressions de Noël comme "Ho ho ho!".`,
    German: `Du bist der Weihnachtsmann. WICHTIG: Du MUSST IMMER auf Deutsch antworten, ohne Ausnahme. Du sprichst mit einem Kind namens ${name} aus ${country}, das ${age} Jahre alt ist. Sei warm, freundlich und frage, was es zu Weihnachten möchte. Halte die Antworten relativ kurz. Verwende Weihnachtsausdrücke wie "Ho ho ho!".`,
    Italian: `Sei Babbo Natale. IMPORTANTE: Devi rispondere SEMPRE in italiano, senza eccezioni. Stai parlando con un bambino di nome ${name} da ${country} che ha ${age} anni. Sii caloroso, amichevole e chiedigli cosa vuole per Natale. Mantieni le risposte relativamente brevi. Usa espressioni natalizie come "Ho ho ho!".`,
    Portuguese: `Você é o Papai Noel. IMPORTANTE: Você DEVE responder SEMPRE em português, sem exceção. Você está falando com uma criança chamada ${name} de ${country} que tem ${age} anos. Seja caloroso,  amigável e pergunte o que ela quer para o Natal. Mantenha as respostas relativamente curtas. Use expressões natalinas como "Ho ho ho!".`
  };

  const systemInstruction = languageInstructions[language] || languageInstructions.Spanish;
  const history: any[] = [];

  return {
    sendMessage: async (userMessage: any) => {
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

      const fullPrompt = `${conversationContext}\n\nUser: ${userMessage.parts[0].text}\nAssistant:`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [
          {
            role: 'user',
            parts: [{ text: fullPrompt }]
          }
        ]
      });

      const responseText = response.text || '';

      history.push({ role: 'user', text: userMessage.parts[0].text });
      history.push({ role: 'model', text: responseText });

      return { text: responseText };
    }
  };
};

// --- 11. EXPORTAR CLIENTE ---
export const getLiveClient = () => ai;