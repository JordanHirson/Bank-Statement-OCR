import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  notes: string;
}

export async function extractTransactions(fileBase64: string, mimeType: string): Promise<Transaction[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: fileBase64,
              mimeType: mimeType,
            },
          },
          {
            text: "Extract all transactions from this bank statement. For each transaction, provide the date, description, amount, and any relevant notes. Use negative numbers for expenses/spending and positive numbers for income/deposits. Return the data as a JSON array of objects.",
          },
        ],
      },
    ],
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: "The date of the transaction" },
            description: { type: Type.STRING, description: "The title or description of the transaction" },
            amount: { type: Type.NUMBER, description: "The transaction amount. Use negative for expenses/spending and positive for income/deposits." },
            notes: { type: Type.STRING, description: "Any additional notes or categories inferred" },
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
