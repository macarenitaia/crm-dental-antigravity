
import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY || 'sk-missing-key-for-build';

export const openai = new OpenAI({
    apiKey: apiKey,
});
