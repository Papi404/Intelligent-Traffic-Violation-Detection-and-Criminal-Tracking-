import { GoogleGenAI } from "@google/genai";

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        resolve('');
      }
    };
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

// IMPORTANT: This line assumes the API key is set in the environment.
// Do not hardcode the API key here or expose it in the frontend.
// FIX: Changed type annotation to 'any' to resolve "Cannot use namespace 'GoogleGenAI' as a type" error.
let ai: any;
try {
    ai = new GoogleGenAI({ apiKey: "AIzaSyBmjZZIDKv7pBurliG_vGARo6EVySmQZqI" });
// FIX: Added type 'any' to the caught error to resolve the TypeScript error.
} catch (error: any) {
    console.error("Failed to initialize GoogleGenAI. Is the API key set?", error);
    // You might want to handle this case in the UI, e.g., show an error message.
}


export const readLicensePlates = async (imageFile: File): Promise<string[]> => {
  if (!ai) throw new Error("GoogleGenAI not initialized. Check API Key.");
  const imagePart = await fileToGenerativePart(imageFile);
  const prompt = "Analyze this image. Identify all vehicle license plates visible. Return only a comma-separated list of the license plate numbers. If no plates are found, return an empty string.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, { text: prompt }] },
    });

    // FIX: Removed optional chaining to align with Gemini API guidelines for accessing response text.
    const text = response.text;
    if (!text || typeof text !== 'string') {
      return [];
    }
    
    return text.trim().split(',').map(plate => plate.trim()).filter(Boolean);
// FIX: Added type 'any' to the caught error for consistency and to prevent potential TypeScript errors.
  } catch (error: any) {
    console.error("Error in readLicensePlates:", error);
    return []; // Return empty array on error to prevent app crash
  }
};

export const detectViolations = async (imageFile: File): Promise<string> => {
  if (!ai) throw new Error("GoogleGenAI not initialized. Check API Key.");
  const imagePart = await fileToGenerativePart(imageFile);
  const prompt = "Analyze this traffic scene image for traffic violations. Describe each violation in a few words (e.g., 'No helmet', 'Illegal lane change'). Use a bulleted list if there are multiple violations. IMPORTANT: If and only if there are absolutely no violations, return the single word 'NONE'.";
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [imagePart, { text: prompt }] },
    });

    // FIX: Removed optional chaining to align with Gemini API guidelines for accessing response text.
    return response.text.trim() || "NONE";
// FIX: Added type 'any' to the caught error for consistency and to prevent potential TypeScript errors.
  } catch (error: any) {
      console.error("Error in detectViolations:", error);
      return "Failed to detect violations due to an API error.";
  }
};
