import dotenv from 'dotenv';
dotenv.config();
export const config = {
    port: Number.parseInt(process.env.PORT ?? '4000', 10),
    mockLlm: (process.env.MOCK_LLM ?? 'true').toLowerCase() === 'true',
    openAiApiKey: process.env.OPENAI_API_KEY,
    openAiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
};
