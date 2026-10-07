import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import type { AppConfig } from './types/config.js'

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) })

export const config: AppConfig = {
  port: Number.parseInt(process.env.PORT ?? '4000', 10),
  wsPort: Number.parseInt(process.env.WS_PORT ?? String(Number.parseInt(process.env.PORT ?? '4000', 10) + 1), 10),
  groqBaseUrl: process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1',
  groqModel: process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b',
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
}
