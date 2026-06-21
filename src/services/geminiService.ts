import { GoogleGenAI } from '@google/genai';

export interface GeminiTip {
  tip: string;
  estimatedSavingsKg: number;
}

/**
 * Service to generate personalized eco-action tips using Gemini models.
 * Uses the latest recommended models like gemini-2.5-flash or preview models.
 * 
 * @param log The daily log object containing transport, diet, and energy data.
 * @returns A promise resolving to a GeminiTip containing the advice and estimated carbon savings.
 */
export async function generateEcoTip(log: {
  transportKms: number;
  transportType: string;
  dietType: string;
  energyKwh: number;
}): Promise<GeminiTip> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("VITE_GEMINI_API_KEY is not defined. Returning a fallback tip.");
    return {
      tip: "Consider walking or biking for distances under 3km to easily save carbon emissions.",
      estimatedSavingsKg: 0.8
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    // System instruction enforces structured JSON output.
    const systemInstruction = `
      You are an expert environmental science AI assistant.
      Your task is to analyze the user's daily log:
      - Transport: ${log.transportKms} kms via ${log.transportType}
      - Diet: ${log.dietType}
      - Energy: ${log.energyKwh} kWh
      
      Suggest ONE actionable, highly practical daily challenge/tip the user can perform tomorrow to further reduce their emissions.
      You must respond with a JSON object containing precisely these fields:
      - "tip": A descriptive, single-sentence advice string.
      - "estimatedSavingsKg": A realistic estimate of carbon saved (in kg) if they perform this action.
      
      Example:
      {
        "tip": "Unplug household appliances and chargers when not in use to eliminate standby energy draw.",
        "estimatedSavingsKg": 0.4
      }
    `;

    // We can use 'gemini-2.5-flash' as defined in rules.md, or fallback to preview models if desired.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Provide my daily personalized eco-friendly tip.',
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      }
    });

    const responseText = response.text || '';
    const parsedTip = JSON.parse(responseText.trim()) as GeminiTip;
    
    return {
      tip: parsedTip.tip || "Try to use natural sunlight instead of artificial lighting today.",
      estimatedSavingsKg: typeof parsedTip.estimatedSavingsKg === 'number' ? parsedTip.estimatedSavingsKg : 0.5
    };
  } catch (error) {
    console.error("Error generating Gemini tip, falling back to gemini-1.5-flash:", error);
    try {
      // Fallback model query
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: 'Provide my daily personalized eco-friendly tip in JSON format with "tip" and "estimatedSavingsKg".',
        config: {
          responseMimeType: 'application/json',
        }
      });
      const parsedTip = JSON.parse(response.text || '{}') as GeminiTip;
      return {
        tip: parsedTip.tip || "Try switching off unused lights and electrical appliances.",
        estimatedSavingsKg: parsedTip.estimatedSavingsKg || 0.5
      };
    } catch (fallbackError) {
      console.error("Fallback failed:", fallbackError);
      return {
        tip: "Try switching off unused lights and electrical appliances to save grid power.",
        estimatedSavingsKg: 0.5
      };
    }
  }
}
