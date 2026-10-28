// 修改大屏内容
import { HumanMessage } from '@langchain/core/messages'
import { createNonStreamingModel } from '../../ai/model.js'
import { ActionTypeEnum } from './planEdit.js'
import { createAgent, toolStrategy } from 'langchain'
import { searchEChartsOptions } from '../../rag/tools.ts'
import { generateDataSource, updateDataSource } from './dataSource.ts'

async function generateNode(materialSchema, prompt) {
  const agent = createAgent({
    model: createNonStreamingModel(),
    tools: [searchEChartsOptions],
    responseFormat: toolStrategy(materialSchema.configSchema), // 使用物料的 configSchema 作为结构化输出 Schema
    systemPrompt: `
      你是一个 AI 大屏设计器的节点生成助手。
      请根据用户要求生成一个完整的 ${materialSchema.name} 节点。
      必须遵守结构化输出 Schema。
      对于可选属性，如果用户没有明确要求，可以留空。
      如果是图表物料，使用的是 ECharts，props.option 必须使用 ECharts 的配置字段完成。

      如果需要确认 ECharts 配置字段、嵌套路径或字段含义，
      可以调用 search_echarts_options 查询 ECharts 官方配置。
    `,
  })

  const result = await agent.invoke({
    messages: [new HumanMessage(prompt)],
  })

  const node = result.structuredResponse as Record<string, unknown>

  return {
    ...node,
    id: crypto.randomUUID(),
    type: materialSchema.type,
  }
}

async function updateNode(currentNode, materialSchema, prompt) {
  const agent = createAgent({
    model: createNonStreamingModel(),
    tools: [searchEChartsOptions],
    responseFormat: toolStrategy(materialSchema.configSchema),
    systemPrompt: `
      你是一个 AI 大屏设计器的节点修改助手。
      当前选中的节点是 ${materialSchema.name}，请根据用户的要求修改该节点。
      必须遵守结构化输出 Schema。
      对于可选属性，如果用户没有明确要求，可以留空。
      如果是图表物料，使用的是 ECharts，props.option 必须使用 ECharts 的配置字段完成。

      如果需要确认 ECharts 配置字段、嵌套路径或字段含义，
      可以调用 search_echarts_options 查询 ECharts 官方配置。

      规则：
       - 只能修改当前节点的 props、layout、style 等属性。
       - 禁止修改节点的 id、type 等属性。

      当前节点的内容：

      ${JSON.stringify(currentNode, null, 2)}
    `,
  })

  const result = await agent.invoke({
    messages: [new HumanMessage(prompt)],
  })

  const node = result.structuredResponse as Record<string, unknown>

  return {
    ...node,
    id: currentNode.id,
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

    if (action === ActionTypeEnum.ADD_DATA_SOURCE) {
      const dataSouce = await generateDataSource(prompt, state.schema.dataSource)
      actions.push({ node: dataSouce, type: ActionTypeEnum.ADD_DATA_SOURCE })
    }

    if (action === ActionTypeEnum.UPDATE_DATA_SOURCE) {
      const currentDataSource = state.dataSources.find(ds => ds.id === id)
      const dataSouce = await updateDataSource(prompt, currentDataSource, state.schema.dataSource)
      actions.push({ node: dataSouce, type: ActionTypeEnum.UPDATE_DATA_SOURCE })
    }
  }

  return {
    actions,
  }
}
