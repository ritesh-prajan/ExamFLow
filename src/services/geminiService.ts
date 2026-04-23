import { Topic, Module } from "../types";
import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini API lazily to prevent module load crashes if key is missing
let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : undefined;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is missing. AI features will be unavailable.");
    }
    aiInstance = new GoogleGenAI({ apiKey: (apiKey || "placeholder") });
  }
  return aiInstance;
}

export async function parseSyllabus(text: string): Promise<{ subject: string; modules: Module[]; topics: Topic[] }> {
  try {
    console.log("Parsing syllabus via Gemini API (Frontend)...");
    const ai = getAI();
    
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Gemini API key is not configured. Please add GEMINI_API_KEY to your environment variables.");
    }
    
    const prompt = `
      You are an expert academic coordinator specializing in curriculum breakdown. Your task is to perform an EXHAUSTIVE and GRANULAR analysis of the provided syllabus text.
      
      CRITICAL INSTRUCTIONS:
      1. TOTAL COMPREHENSIVENESS: Do not skip ANY concepts, sub-topics, or sections mentioned in the text. Even if the text is messy, identify and extract all distinct learning units.
      2. ABSOLUTELY NO SUMMARIZATION: Do not group multiple distinct concepts into a single topic. If a sentence or bullet point mentions three different concepts (e.g., "A, B, and C"), you MUST create three separate topic entries.
      3. MAXIMUM GRANULARITY: Break down broad modules into the smallest possible manageable topics. A "topic" should represent a single specific concept that can be studied in 5 to 15 minutes. This app is for quick bursts of learning.
      4. LOGICAL STRUCTURE: Organize these topics into the modules/units as defined in the text. If no modules are clear, group related topics into logical "Modules".
      5. METADATA ACCURACY: 
         - Priority: High (core concepts), Medium (supporting concepts), Low (supplementary).
         - Estimated Time: CRITICAL. Most topics should be very short (0.1 to 0.3 hours).
           * Simple definitions/facts: 0.1 hours (approx 6 mins).
           * Standard theoretical concepts: 0.2 hours (approx 12 mins).
           * Complex problem-solving: 0.4 - 0.6 hours (approx 24-36 mins).
           * Use increments of 0.1 hours.
         - Dependencies: Identify prerequisite relationships between topics.
      
      Syllabus Text:
      ${text}
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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

    const response = JSON.parse(result.text || "{}");
    
    // Add default values for missing fields to match Topic interface
    const topics = (response.topics || []).map((t: any, index: number) => ({
      ...t,
      mastery: 0,
      status: 'Not Started',
      order: index
    }));

    return {
      subject: response.subject || "Custom Subject",
      modules: response.modules || [],
      topics: topics
    };
  } catch (error: any) {
    console.error("Gemini Syllabus Parsing Error:", error);
    throw new Error(`AI failed to parse syllabus: ${error.message}`);
  }
}

export async function suggestDependencies(topics: Topic[], subjectName: string): Promise<{ topicId: string; prerequisiteIds: string[] }[]> {
  try {
    console.log("Suggesting dependencies via Gemini API...");
    const ai = getAI();
    
    if (!process.env.GEMINI_API_KEY) {
      return [];
    }
    
    const prompt = `
      You are an expert academic coordinator. Given a list of topics for the subject "${subjectName || 'Unknown'}", identify logical dependencies between them.
      A dependency means topic A should be studied before topic B.
      
      Topics:
      ${topics.map(t => `- ID: ${t.id}, Name: ${t.name}, Module: ${t.module}`).join('\n')}
      
      Return a mapping of topic IDs to their prerequisite topic IDs.
      Only include logical academic dependencies. Do not create circular dependencies.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dependencies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topicId: { type: Type.STRING },
                  prerequisiteIds: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["topicId", "prerequisiteIds"]
              }
            }
          },
          required: ["dependencies"]
        }
      }
    });

    const response = JSON.parse(result.text || "{}");
    return response.dependencies || [];
  } catch (error: any) {
    console.error("Gemini Dependency Suggestion Error:", error);
    return [];
  }
}

export async function estimateTopicDurations(topics: { name: string; module: string }[], subjectName: string): Promise<number[]> {
  try {
    console.log("Estimating durations via Gemini API...");
    const ai = getAI();
    
    if (!process.env.GEMINI_API_KEY) {
      return topics.map(() => 0.2);
    }
    
    const prompt = `
      You are an educational consultant. Given a list of topics for the subject "${subjectName || 'Unknown'}", provide a realistic study time estimate in hours for each topic.
      
      Guidelines for estimation (CRITICAL: Most topics take ~10 minutes):
      - Most granular topics take between 0.1 to 0.5 hours.
      - Be realistic based on typical student speed for a SINGLE specific concept. 
      - Units are in HOURS. 0.1 hours = 6 minutes, 0.2 = 12 minutes, etc.
      - Use strictly 0.1 hour increments (e.g., 0.1, 0.2, 0.3).
      
      Topics to estimate:
      ${topics.map((t, i) => `${i + 1}. Name: ${t.name}, Module: ${t.module}`).join('\n')}
      
      Return a list of estimated times in the same order as provided.
    `;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            estimates: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  estimatedTime: { type: Type.NUMBER }
                },
                required: ["estimatedTime"]
              }
            }
          },
          required: ["estimates"]
        }
      }
    });

    const response = JSON.parse(result.text || "{}");
    return (response.estimates || []).map((e: any) => e.estimatedTime);
  } catch (error: any) {
    console.error("Gemini Time Estimation Error:", error);
    // Fallback to default times (approx 12 mins)
    return topics.map(() => 0.2);
  }
}

export async function getStudyTip(topics: Topic[], subjectName: string, mastery: number): Promise<{ tip: string; action: string }> {
  const tips = [
    { tip: "Believe you can and you're halfway there. Keep pushing through those complex modules!", action: "Keep Going" },
    { tip: "Success is the sum of small efforts, repeated day in and day out. Every topic counts!", action: "Master More" },
    { tip: "Don't stop until you're proud. Focus on your high-priority items today for maximum impact.", action: "Review Now" },
    { tip: "Your potential is endless. Master the fundamentals and the rest will follow logically.", action: "Start Focus" },
    { tip: "Small progress is still progress. You've mastered multiple topics already - keep the momentum!", action: "View Progress" },
    { tip: "The expert in anything was once a beginner. Be patient with yourself as you learn.", action: "Learn More" },
    { tip: "Consistency is key. You're building a smarter future with every study session you complete.", action: "Stay Steady" },
    { tip: "Dream big, work hard, and stay focused. Your exam preparation is looking stronger every day.", action: "Execute Plan" },
    { tip: "Focus on being productive instead of busy. Tackle the difficult concepts while your mind is fresh.", action: "Deep Work" },
    { tip: "The only way to predict your future is to create it. Keep refining your mastery of this subject.", action: "Build Future" }
  ];

  // Logic to potentially pick a tip based on mastery or topics, 
  // but user requested randomized.
  const randomIndex = Math.floor(Math.random() * tips.length);
  
  // Return a promise to maintain compatibility with existing async calls
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(tips[randomIndex]);
    }, 500); // Small artificial delay for "AI" feel
  });
}
