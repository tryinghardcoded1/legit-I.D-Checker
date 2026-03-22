import { GoogleGenAI, Type } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing. Please set it in your environment variables.");
      // We still initialize it so it doesn't crash the whole app, but API calls will fail later.
      // Or we can throw an error here, which will be caught by the try-catch in the functions.
      throw new Error("GEMINI_API_KEY is missing. Please set it in your Vercel Environment Variables.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export interface ScamAnalysisResult {
  trustScore: number;
  redFlags: string[];
  greenFlags: string[];
  idType?: string;
  reasoning?: string;
}

export const detectIdType = async (imageBase64: string): Promise<string | null> => {
  const systemInstruction = `You are an expert at identifying Philippine government-issued IDs. Analyze the provided image and determine the type of ID. Return ONLY the ID type name from the following list, or null if it's not recognized or uncertain: Passport, Driver's License, UMID (SSS / GSIS), PhilSys ID (National ID), Postal ID, PhilHealth ID, TIN ID, Voter's ID / Voter's Certificate, PRC ID, Senior Citizen ID, PWD ID, Barangay ID / Clearance.`;

  const mimeType = imageBase64.substring(imageBase64.indexOf(':') + 1, imageBase64.indexOf(';'));
  const base64Data = imageBase64.split(',')[1];

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: 'Identify this ID type.' },
          {
            inlineData: {
              data: base64Data,
              mimeType
            }
          }
        ]
      },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            idType: {
              type: Type.STRING,
              description: 'The detected ID type, or null if uncertain.'
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    const result = JSON.parse(text);
    return result.idType || null;
  } catch (error) {
    console.error('Error detecting ID type:', error);
    return null;
  }
};

export const analyzeQuery = async (idType: string, language: string = 'English', frontImageBase64?: string, backImageBase64?: string): Promise<ScamAnalysisResult> => {
  const systemInstruction = `You are "Ali", the AI brain and fraud detection expert for the Philippines. Your primary role is to determine the legitimacy of an ID. Analyze the provided ID images for signs of forgery, tampering, or mismatch with the expected format. If both front and back of an ID are provided, cross-reference them for consistency (e.g., barcodes, holograms, matching info).

If the user claims a specific ID type (like PhilHealth ID, Driver's License, UMID, etc.), rigorously verify that the ID matches the official format for that ID type. For example, a PhilHealth ID must have the correct PhilHealth logo, a 12-digit PhilHealth Identification Number (PIN) formatted as XX-XXXXXXXXX-X, and the member's photo and signature. If the layout, fonts, or fields do not match the expected official template, flag it as fake.

Provide a "Trust Score" (1-10, where 1 means lowest trust/highly likely fake, and 10 means highest trust/legit), a brief list of "Red Flags" or "Green Flags", and the detected "ID Type".

Crucially, provide detailed "Reasoning" for the ID authenticity:
- When an ID is flagged as fake, elaborate on specific visual anomalies detected:
  * Font mismatches: Specify if it's serif vs. sans-serif, inconsistent weight, incorrect kerning, or mismatched typography compared to official templates.
  * Blurry watermarks: Detail if the watermark has obscured details, pixelation, lacks depth, or appears printed rather than embedded.
  * Other anomalies: Incorrect hologram placement, tampered photo edges, or misaligned data fields.
- For legitimate IDs, highlight specific security features verified:
  * Format correctness: Verify if the ID number format (like the PhilHealth PIN) is correct.
  * Hologram type: Specify the type of hologram (e.g., photopolymer, embossed) and its correct alignment/reflectivity.
  * Microprint text clarity: Confirm the crispness and legibility of microprinting under magnification simulation.
  * Other features: Consistent typography, correct UV features (if visible), and proper card material texture.

IMPORTANT: You MUST provide the "Red Flags", "Green Flags", and "Reasoning" in ${language}. The "idType" should remain in English.`;

  const parts: any[] = [];
  if (idType) {
    parts.push({ text: `The user claims this ID is a: ${idType}. Please verify if the uploaded image matches this ID type and check for authenticity.` });
  } else {
    parts.push({ text: `Analyze the provided ID image(s) for authenticity and potential scam flags.` });
  }

  if (frontImageBase64) {
    const mimeType = frontImageBase64.substring(frontImageBase64.indexOf(':') + 1, frontImageBase64.indexOf(';'));
    const base64Data = frontImageBase64.split(',')[1];
    parts.push({ text: 'Front of ID:' });
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType
      }
    });
  }

  if (backImageBase64) {
    const mimeType = backImageBase64.substring(backImageBase64.indexOf(':') + 1, backImageBase64.indexOf(';'));
    const base64Data = backImageBase64.split(',')[1];
    parts.push({ text: 'Back of ID:' });
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType
      }
    });
  }

  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: { parts },
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          trustScore: {
            type: Type.NUMBER,
            description: 'A trust score from 1 (very likely a scam) to 10 (very trustworthy).'
          },
          redFlags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'List of red flags identified.'
          },
          greenFlags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'List of green flags identified.'
          },
          idType: {
            type: Type.STRING,
            description: 'The detected format/type of the Philippine ID (e.g., PhilSys, UMID, Driver\'s License). Null if no ID is detected.'
          },
          reasoning: {
            type: Type.STRING,
            description: 'A clear explanation of why the ID or query is considered fake or legit, pointing out specific details from the front and back of the ID if provided.'
          }
        },
        required: ['trustScore', 'redFlags', 'greenFlags', 'reasoning']
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error('No response from AI');
  }

  return JSON.parse(text) as ScamAnalysisResult;
};
