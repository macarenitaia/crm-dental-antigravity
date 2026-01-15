
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY!;

if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing in environment variables');
}

export const genAI = new GoogleGenerativeAI(apiKey);

export const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp", // Or gemini-1.5-pro, using the latest efficient one
});

// Embedding model
export const embeddingModel = genAI.getGenerativeModel({
    model: "text-embedding-004",
});
