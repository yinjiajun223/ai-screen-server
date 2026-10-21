import { MessagesValue, StateSchema } from '@langchain/langgraph'
import { z } from 'zod'
import { ClassificationSchema } from './classification.js'
import { ActionSchemaType, PlanEditSchema } from './task-nodes/planEdit.js'

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
  editPlan: z.array(PlanEditSchema),
  actions: z.array(
    z.object({
      type: ActionSchemaType,
      node: z.record(z.string(), z.json()),
    })
  ).default([]),
})

/**
 * 新增两个文本节点：
 * 第一个名称和内容都是“测试标题”，位置 x=200、y=80，宽度 600、高度 80，字号 56，白色。
 * 第二个名称和内容都是“测试说明”，位置 x=200、y=400，宽度 600、高度 60，字号 28，灰色。
 */

// const actions = [
//   {
//     action: ActionTypeEnum.ADD_NODE,
//     type: 'text',
//     prompt: '新增一个文本节点，名称和内容都是“测试标题”，位置 x=200、y=80，宽度 600、高度 80，字号 56，白色。',
//   },
//   {
//     action: ActionTypeEnum.ADD_NODE,
//     type: 'text',
//     prompt: '新增一个文本节点，名称和内容都是“测试说明”，位置 x=200、y=400，宽度 600、高度 60，字号 28，灰色。',
//   },
//   {
//     action: ActionTypeEnum.ADD_NODE,
//     type: 'text',
//     id: 'node-2',
//     prompt: '更新一个文本节点，名称和内容都是“测试说明”，位置 x=200、y=400，宽度 600、高度 60，字号 28，灰色。',
//   },
// ]
