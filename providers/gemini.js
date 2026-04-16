import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

if (!GOOGLE_API_KEY) {
  throw new Error("Missing GOOGLE_API_KEY in .env file");
}
export const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });