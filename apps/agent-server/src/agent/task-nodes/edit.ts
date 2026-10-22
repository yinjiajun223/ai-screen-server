// 修改大屏内容

import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { createNonStreamingModel } from '../../ai/model.js'
import { literal, z } from 'zod'
import { ActionTypeEnum } from './planEdit.js'

const generateNode = async (materialSchema, prompt) => {
  /**
   * 根据用户的提示词结合 schema，生成一个新的节点对象。
   * 1、用户提示词
   * 2、物料 schema
   */

  const model = createNonStreamingModel().withStructuredOutput(materialSchema.configSchema, {
    name: 'generate_node',
    method: 'jsonSchema',
  })

  const node = await model.invoke([
    new SystemMessage(`
      你是一个 AI 大屏设计器的节点生成助手。
      请根据用户要求生成一个完整的 ${materialSchema.name} 节点。
      必须遵守结构化输出 Schema。 
      对于可选属性，如果用户没有明确要求，可以留空。
      如果是图表物料，使用的是 ECharts，props.option 必须使用 ECharts 的配置字段完成。
    `),
    new HumanMessage(prompt),
  ])

  return { ...node, type: materialSchema.type, id: crypto.randomUUID() }
}

const updateNode = async (currentNode, materialSchema, prompt) => {
  /**
   * 根据用户的提示词结合 schema，生成一个新的节点对象。
   * 1、用户提示词
   * 2、物料 schema
   */

  const model = createNonStreamingModel().withStructuredOutput(materialSchema.configSchema, {
    name: 'material_node',
    method: 'jsonSchema',
  })

  const res = await model.invoke([
    new SystemMessage(`
      你是一个 AI 大屏设计器的节点修改助手。
      当前选中的节点是 ${materialSchema.name}，请根据用户的要求修改该节点。
      必须遵守结构化输出 Schema。
      对于可选属性，如果用户没有明确要求，可以留空。
      如果是图表物料，使用的是 ECharts，props.option 必须使用 ECharts 的配置字段完成。

      规则：
      - 只能修改当前节点的 props、layout、style 等属性，禁止修改节点的 type 和 id。
      当前节点的内容：

      ${JSON.stringify(currentNode, null, 2)}
    `),
    new HumanMessage(prompt),
  ])

  return {
    ...res,
    id: currentNode.id, // 防止 AI 生成一个新的 id，导致节点被替换掉，而不是修改当前节点
    type: currentNode.type,
  }
}

export const handleEditTask = async state => {
  const plans = state.editPlan

  const actions = []
  for (const plan of plans) {
    const { action, id, type, prompt } = plan
    const schema = state.schema.material.find(item => item.type === type)

    if (action === ActionTypeEnum.ADD_NODE) {
      // 新增节点
      const node = await generateNode(schema, prompt) // 根据 schema 提示词 生成新的节点对象
      actions.push({ node, type: ActionTypeEnum.ADD_NODE })
    }

    const currentNode = state.page.nodes.find(node => node.id === id)
    if (action === ActionTypeEnum.UPDATE_NODE) {
      // 修改节点
      const node = await updateNode(currentNode, schema, prompt)
      actions.push({ node, type: ActionTypeEnum.UPDATE_NODE })
    }

    if (action === ActionTypeEnum.REMOVE_NODE) {
      // 删除节点 不需要调用大模型 通知前端删除就可以
      actions.push({ node: currentNode, type: ActionTypeEnum.REMOVE_NODE })
    }
  }

  return {
    actions,
  }
}
