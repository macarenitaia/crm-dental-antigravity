
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || 'missing_key_for_build';

export const genAI = new GoogleGenerativeAI(apiKey);

export const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
});

// Embedding model
export const embeddingModel = genAI.getGenerativeModel({
    model: "text-embedding-004",
});
