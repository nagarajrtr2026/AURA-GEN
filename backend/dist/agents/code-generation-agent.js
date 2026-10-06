import { z } from 'zod';
import { CODE_GENERATION_PROMPT } from '../prompts/code-generation-prompt.js';
import { generatedUIPayloadSchema } from '../schemas/ui-schema.js';
import { LangChainProviderAdapter } from '../services/langchain-provider.js';
import { validateGeneratedReactCode } from '../services/react-code-validator.js';
const llmResponseSchema = z.object({
    reactCode: z.string().min(1),
    payload: generatedUIPayloadSchema,
});
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 50;
function shapeOf(value) {
    if (Array.isArray(value))
        return value.map(shapeOf);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, shapeOf(child)]));
    }
    return typeof value;
}
export class CodeGenerationAgent {
    provider;
    cache = new Map();
    inFlight = new Map();
    constructor(provider = new LangChainProviderAdapter()) {
        this.provider = provider;
    }
    async generate(payload, callbacks = {}) {
        const cacheKey = this.getCacheKey(payload);
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            this.cache.delete(cacheKey);
            this.cache.set(cacheKey, cached);
            console.info('[CodeGenerationAgent] cache hit');
            callbacks.onCacheHit?.('cache');
            return this.withCurrentState(cached.payload, payload.formState);
        }
        if (cached)
            this.cache.delete(cacheKey);
        const pending = this.inFlight.get(cacheKey);
        if (pending) {
            console.info('[CodeGenerationAgent] in-flight cache hit');
            callbacks.onCacheHit?.('inflight');
            if (callbacks.onToken)
                pending.tokenListeners.add(callbacks.onToken);
            try {
                return this.withCurrentState(await pending.promise, payload.formState);
            }
            finally {
                if (callbacks.onToken)
                    pending.tokenListeners.delete(callbacks.onToken);
            }
        }
        console.info('[CodeGenerationAgent] cache miss');
        const tokenListeners = new Set();
        if (callbacks.onToken)
            tokenListeners.add(callbacks.onToken);
        const generation = Promise.resolve().then(() => this.generateUncached(payload, {
            onToken: (token) => {
                tokenListeners.forEach((listener) => {
                    try {
                        listener(token);
                    }
                    catch (error) {
                        console.warn('[CodeGenerationAgent] token listener failed', error);
                    }
                });
            },
        }))
            .then((generated) => {
            this.cache.set(cacheKey, { payload: generated, expiresAt: Date.now() + CACHE_TTL_MS });
            while (this.cache.size > CACHE_MAX_ENTRIES) {
                const oldestKey = this.cache.keys().next().value;
                if (oldestKey === undefined)
                    break;
                this.cache.delete(oldestKey);
            }
            return generated;
        })
            .finally(() => this.inFlight.delete(cacheKey));
        this.inFlight.set(cacheKey, { promise: generation, tokenListeners });
        return this.withCurrentState(await generation, payload.formState);
    }
    getCacheKey(payload) {
        const formShape = Object.fromEntries(Object.entries(payload.formState).sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => [
            key,
            key === 'currentSection' ? value : shapeOf(value),
        ]));
        return JSON.stringify({
            frictionLevel: payload.frictionLevel,
            activeField: payload.telemetry.activeField,
            currentSection: payload.formState.currentSection,
            formShape,
        });
    }
    withCurrentState(payload, formState) {
        return { ...payload, state: formState, timestamp: Date.now() };
    }
    async generateUncached(payload, callbacks) {
        const promptContext = {
            ...payload,
            formState: Object.fromEntries(Object.entries(payload.formState).map(([key, value]) => [key, key === 'currentSection' ? value : shapeOf(value)])),
        };
        const prompt = CODE_GENERATION_PROMPT.replace('{{TELEMETRY}}', JSON.stringify(promptContext, null, 2));
        try {
            const raw = await this.provider.generate(prompt, callbacks.onToken);
            const parsed = JSON.parse(raw);
            const safe = llmResponseSchema.safeParse(parsed);
            if (!safe.success) {
                throw new Error(`LLM output failed validation: ${safe.error.message}`);
            }
            const validation = validateGeneratedReactCode(safe.data.reactCode);
            if (!validation.approved) {
                throw new Error(`Generated React code was rejected: ${validation.error}`);
            }
            return generatedUIPayloadSchema.parse({
                ...safe.data.payload,
                state: payload.formState,
                timestamp: Date.now(),
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown LLM error.';
            throw new Error(`Code generation failed: ${message}`);
        }
    }
}
