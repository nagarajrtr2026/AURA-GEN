import { ChatOpenAI } from '@langchain/openai';
import { config } from '../config.js';
export class LangChainProviderAdapter {
    async generate(prompt, onToken) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY is required for the LangChain provider adapter.');
        }
        const model = new ChatOpenAI({
            apiKey,
            model: config.openAiModel,
            temperature: 0.2,
            configuration: config.openAiBaseUrl ? { baseURL: config.openAiBaseUrl } : undefined,
        });
        if (!onToken) {
            const response = await model.invoke(prompt);
            return typeof response === 'string' ? response : String(response.content ?? '');
        }
        let output = '';
        const stream = await model.stream(prompt);
        for await (const chunk of stream) {
            const content = chunk.content;
            const token = typeof content === 'string'
                ? content
                : Array.isArray(content)
                    ? content.map((part) => typeof part === 'string' ? part : 'text' in part && typeof part.text === 'string' ? part.text : '').join('')
                    : '';
            if (!token)
                continue;
            output += token;
            onToken(token);
        }
        return output;
    }
}
