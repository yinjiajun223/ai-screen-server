// 修改大屏内容

import { AIMessage, SystemMessage } from '@langchain/core/messages'
import { createNonStreamingModel } from '../../ai/model.js'
import { literal, z } from 'zod'
import { getLastUserMessage } from '../../utils/index.js'

const getMaterialSchema = async state => {
  /**
   * 获取到新增节点的 schema，包含节点的类型、内容和样式等信息。
   * 1、用户提示词
   * 2、所有物料 schema
   */
  const materialSchema = state.schema.material
  const materials = state.schema.material.map(item => ({
    type: item.type,
    name: item.name,
  }))

  const model = createNonStreamingModel().withStructuredOutput(
    z.object({
      type: z.enum(materialSchema.map(m => m.type)).describe('新增节点的类型'),
    }),
    {
      name: 'material_schema',
      method: 'jsonSchema',
    }
  )

  const res = await model.invoke([
    new SystemMessage(`
      你是一个 AI 大屏设计器的物料选择助手。
      请根据用户的要求，从下面的可用物料中选择最合适的一个。
      可用物料：
      ${JSON.stringify(materials, null, 2)}
    `),
    getLastUserMessage(state.messages),
  ])

  return state.schema.material.find(item => item.type === res.type)
}

const generateNode = async (state, materialSchema) => {
  /**
   * 根据用户的提示词结合 schema，生成一个新的节点对象。
   * 1、用户提示词
   * 2、物料 schema
   */

  const schema = z.fromJSONSchema(materialSchema.configSchema) as z.ZodObject
  const model = createNonStreamingModel().withStructuredOutput(
    schema.extend({
      id: literal(crypto.randomUUID()).describe('新增节点的唯一标识符'),
    }),
    {
      name: 'generate_node',
      method: 'jsonSchema',
    }
  )

  return await model.invoke([
    new SystemMessage(`
      你是一个 AI 大屏设计器的节点生成助手。
      请根据用户要求生成一个完整的 ${materialSchema.name} 节点。
      必须遵守结构化输出 Schema。 
      对于可选属性，如果用户没有明确要求，可以留空。
    `),
    getLastUserMessage(state.messages),
  ])
}

export const handleEditTask = async state => {
  console.log('state', state)
  if (state.classification.operation === 'add_node') {
    /**
     * 新增节点：
     * 1. 获取到新增节点的 schema，包含节点的类型、内容和样式等信息。
     * 2. 根据用户的提示词结合 schema，生成一个新的节点对象。
     */
    const schema = await getMaterialSchema(state) // 获取新增节点的 schema

    const node = await generateNode(state, schema) // 根据 schema 生成新的节点对象
    return {
      action: {
        type: 'add_node',
        node,
      },
    }
  }
  return {
    messages: [
      new AIMessage(`接到任务：根据用户的需求，需要对当前画布进行修改。`),
    ],
  }
}
