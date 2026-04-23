import { GoogleGenAI, Type } from "@google/genai";

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { text } = JSON.parse(event.body || "{}");
    if (!text) {
      return { statusCode: 400, body: JSON.stringify({ error: "Text is required" }) };
    }

    const apiKey = process.env.EXAMFLOW_AI_SECRET;
    if (!apiKey || apiKey === "YOUR_API_KEY_HERE" || apiKey.trim() === "") {
      console.error("EXAMFLOW_AI_SECRET is missing in Netlify environment");
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: "EXAMFLOW_AI_SECRET is not configured in Netlify Environment Variables." }) 
      };
    }

    console.log(`Using API Key starting with: ${apiKey.trim().substring(0, 4)}...`);

    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    const model = "gemini-flash-latest";

    const prompt = `
      You are an expert academic coordinator specializing in curriculum breakdown. Your task is to perform an EXHAUSTIVE and GRANULAR analysis of the provided syllabus text.
      
      CRITICAL INSTRUCTIONS:
      1. TOTAL COMPREHENSIVENESS: Do not skip ANY concepts, sub-topics, or sections mentioned in the text. If it is in the text, it MUST be in the output.
      2. ABSOLUTELY NO SUMMARIZATION: Do not group multiple distinct concepts into a single topic. If a sentence or bullet point mentions three different concepts (e.g., "A, B, and C"), you MUST create three separate topic entries.
      3. MAXIMUM GRANULARITY: Break down broad modules into the smallest possible manageable topics. A "topic" should represent a single specific concept that can be studied in 0.5 to 2 hours.
      4. LOGICAL STRUCTURE: Organize these topics into the modules/units as defined in the text.
      5. METADATA ACCURACY: 
         - Priority: High (core concepts), Medium (supporting concepts), Low (supplementary).
         - Estimated Time: Be realistic. Most granular topics take 0.5 to 2.5 hours. Use strictly 0.5 hour increments (e.g., 0.5, 1.0, 1.5, 2.0). Do not use other decimals like 0.1 or 0.6.
         - Dependencies: Map out which topics are prerequisites for others.
      
      Syllabus Text:
      ${text}
      
      GOAL: Produce a complete, line-by-line mapping of the entire syllabus into a structured topic list.
    `;

    const result = await ai.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            modules: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  topics: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["id", "name", "topics"]
              }
            },
            topics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  module: { type: Type.STRING },
                  priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                  estimatedTime: { type: Type.NUMBER },
                  dependencies: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["id", "name", "module", "priority", "estimatedTime", "dependencies"]
              }
            }
          },
          required: ["subject", "modules", "topics"]
        }
      }
    });

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: result.text || JSON.stringify({ error: "AI returned an empty response" })
    };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    let errorMessage = "Failed to parse syllabus";
    let statusCode = 500;
    let rawMessage = error.message || "";

    if (rawMessage.includes("429") || rawMessage.includes("RESOURCE_EXHAUSTED")) {
      statusCode = 429;
      errorMessage = "AI Quota Exceeded. Please wait a minute and try again.";
    }

    return {
      statusCode,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type"
      },
      body: JSON.stringify({ error: errorMessage, details: rawMessage })
    };
  }
};
