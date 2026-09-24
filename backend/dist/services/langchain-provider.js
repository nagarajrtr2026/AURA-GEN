import { ChatOpenAI } from '@langchain/openai';
export class LangChainProviderAdapter {
    async generate(prompt) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is required for the LangChain provider adapter.');
        }
        const model = new ChatOpenAI({
            apiKey,
            model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
            temperature: 0.2,
        });
        const response = await model.invoke(prompt);
        return typeof response === 'string' ? response : String(response.content ?? '');
    }
}
