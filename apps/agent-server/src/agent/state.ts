import { MessagesValue, StateSchema } from '@langchain/langgraph'
import { z } from 'zod'
import { ClassificationSchema } from './classification.js'

export const State = new StateSchema({
  // MessagesValue 会保存对话消息，注意，这哥们会在节点返回消息时自动合并，而不是更新
  messages: MessagesValue,
  page: z.record(z.string(), z.json()),
  selectedNodeIds: z.array(z.string()),
  schema: z.object({
    material: z.array(
      z.object({
        type: z.string(),
        name: z.string(),
        configSchema: z.json(),
      })
    ),
    canvas: z.record(z.string(), z.json()),
  }),
  classification: ClassificationSchema,
})
