// src/ai/model.ts
import { ChatOpenAI } from '@langchain/openai'

export function createChatModel(
  options?: ConstructorParameters<typeof ChatOpenAI>[0]
) {
  return new ChatOpenAI({
    model: process.env.AI_MODEL,
    // 使用 Responses API
    useResponsesApi: false,
    modelKwargs: {
      // 注意，咱自己做的事儿，别让它看见，不往里面存
      store: false,
    },
    configuration: {
      baseURL: process.env.AI_BASE_URL,
      apiKey: process.env.AI_API_KEY,
    },
    ...options,
  })
}

export function createNonStreamingModel(
  options?: Parameters<typeof createChatModel>[0]
) {
  return createChatModel({
    ...options,
    disableStreaming: true,
    tags: ['nostream'], // 这个节点不需要流式输出，直接返回最终结果即可
  })
}
