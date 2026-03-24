import { createOpenAI } from '@ai-sdk/openai';
import { streamText, CoreMessage } from 'ai';

export const maxDuration = 30;

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY || '',
});

export async function POST(req: Request) {
  try {
    const { messages, model, temperature, systemPrompt, maxTokens, topP, frequencyPenalty } = await req.json();

    const processedMessages = messages.map((m: any) => {
      if (m.imageBase64 && m.role === 'user') {
        return {
          role: 'user',
          content: [
            { type: 'image', image: m.imageBase64 },
            { type: 'text', text: m.content || '請描述這張圖片。' },
          ],
        };
      }
      return m;
    });

    const fullMessages: CoreMessage[] = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...processedMessages]
      : processedMessages;

    const result = await streamText({
      model: groq(model || 'llama-3.1-8b-instant'),
      messages: fullMessages,
      temperature: Number(temperature) || 0.7,
      maxTokens: Number(maxTokens) || 1024,
      topP: Number(topP) || 1,
      frequencyPenalty: Number(frequencyPenalty) || 0,
    });

    const streamResponse = result.toDataStreamResponse();
    const headers = new Headers(streamResponse.headers);
    headers.set('Cache-Control', 'no-cache');
    headers.set('Connection', 'keep-alive');
    headers.set('X-Accel-Buffering', 'no');
    return new Response(streamResponse.body, {
      status: streamResponse.status,
      headers,
    });

  } catch (error) {
    console.error("API 發生錯誤:", error);
    return new Response(JSON.stringify({ error: "伺服器處理請求時發生錯誤" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}