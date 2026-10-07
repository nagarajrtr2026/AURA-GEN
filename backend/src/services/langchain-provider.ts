import { ChatOpenAI } from '@langchain/openai'
import { config } from '../config.js'

export class LangChainProviderAdapter {
  async generate(prompt: string, onToken?: (token: string) => void): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY?.trim()
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is required for the Groq provider adapter.')
    }

    const model = new ChatOpenAI({
      apiKey,
      model: config.groqModel,
      temperature: 0.2,
      configuration: { baseURL: config.groqBaseUrl },
    })

    if (!onToken) {
      const response = await model.invoke(prompt)
      return typeof response === 'string' ? response : String(response.content ?? '')
    }

    let output = ''
    const stream = await model.stream(prompt)
    for await (const chunk of stream) {
      const content = chunk.content
      const token = typeof content === 'string'
        ? content
        : Array.isArray(content)
          ? content.map((part) => typeof part === 'string' ? part : 'text' in part && typeof part.text === 'string' ? part.text : '').join('')
          : ''
      if (!token) continue
      output += token
      onToken(token)
    }
    return output
  }
}
