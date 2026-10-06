import dotenv from 'dotenv';
dotenv.config();
export const config = {
    port: Number.parseInt(process.env.PORT ?? '4000', 10),
    wsPort: Number.parseInt(process.env.WS_PORT ?? String(Number.parseInt(process.env.PORT ?? '4000', 10) + 1), 10),
    openAiModel: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    openAiBaseUrl: process.env.OPENAI_BASE_URL,
    frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
};
