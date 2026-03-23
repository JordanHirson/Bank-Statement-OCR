import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  notes: string;
}

export interface FileData {
  data: string;
  mimeType: string;
}

export async function extractTransactions(files: FileData[]): Promise<Transaction[]> {
  if (files.length === 0) return [];

  const parts = files.map(file => ({
    inlineData: {
      data: file.data,
      mimeType: file.mimeType,
    },
  }));

  parts.push({
    text: "List all transactions: date (YYYY-MM-DD), description, amount (negative for spent, positive for received), notes. JSON array only.",
  } as any);

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts }],
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING },
            description: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            notes: { type: Type.STRING },
          },
          required: ["date", "description", "amount"],
        },
      },
    },
  });

  try {
    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    return [];
  }
}
