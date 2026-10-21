import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { createChatModel, createNonStreamingModel } from '../../ai/model.js'
import { z } from 'zod'

export enum ActionTypeEnum {
  ADD_NODE = 'add_node',
  REMOVE_NODE = 'remove_node',
  UPDATE_NODE = 'update_node',
}

export const ActionSchemaType = z
  .enum([ActionTypeEnum.ADD_NODE, ActionTypeEnum.REMOVE_NODE, ActionTypeEnum.UPDATE_NODE])
  .describe('用户在编辑页面时的操作类型，add_node = 新增节点，remove_node = 删除节点，update_node = 更新节点')

export const PlanEditSchema = z.object({
  action: ActionSchemaType,
  id: z.string().optional().describe('要操作的节点的唯一标识符，新增节点时可不传，更新或删除节点时必须传'),
  type: z.string().optional().describe('节点类型，新增节点时必须传，更新或删除节点时可不传'),
  prompt: z.string().optional().describe('传给节点生成或修改模型的提示词，包括内容、样式和布局要求等'),
})

export const handlePlanEdit = async state => {
  const materials = state.schema.material.map(item => {
    return {
      type: item.type,
      name: item.name,
    }
  })

  const nodes = state.page.nodes

  const model = createNonStreamingModel().withStructuredOutput(
    z.object({
      editPlan: z.array(
        PlanEditSchema.extend({
          type: z.enum(materials.map(item => item.type)).describe('节点类型，必须是可用物料中的类型'),
          //   id: z
          //     .enum(nodes.map(item => item.id))
          //     .optional()
          //     .describe('要操作的节点的唯一标识符，新增节点时可不传，更新或删除节点时必须传'),
        })
      ),
      message: z.string().nullable().describe('给用户的消息，告诉用户缺少哪些信息；规划成功时为 null'),
    }),
    {
      name: 'edit_plan',
      method: 'jsonSchema',
    }
  )

  const result = await model.invoke([
    new SystemMessage(`
      请把用户要求整理成按执行顺序排列的 editPlan，每项只处理一个节点。
      add_node 的 id 为 null。
      update_node 和 remove_node 必须复制已有节点的真实 id 和 type。
      每项 prompt 必须能独立说明该节点的内容、样式和布局要求。
      如果根据用户提示词无法完成要求，或者用户目标不明确，返回空 editPlan，并通过 message 一次问清楚，如果可以完成规划，则 message 返回 null
      如果可以完成规划 则 message 返回 null

      可用物料：${JSON.stringify(materials, null, 2)}
      已有节点：${JSON.stringify(nodes, null, 2)}
      selectedNodeIds：${JSON.stringify(state.selectedNodeIds, null, 2)}
      画布尺寸：${JSON.stringify(state.page.canvas, null, 2)}
    `),
    ...state.messages,
  ])

  //   说明信息不足 并没有完成任务
  if (!result.editPlan.length) {
    const chatModel = createChatModel()
    const message = await chatModel.invoke([
      new SystemMessage(
        `你是一个 AI 大屏的信息反馈助手，请根据用户的要求，告诉用户缺少哪些信息，或者用户目标不明确，请一次性问清楚。`
      ),
      ...state.messages,
      new HumanMessage(result.message),
    ])

    return {
      messages: [message],
      editPlan: [],
      actions: [],
    }
  }

  return {
    editPlan: result.editPlan,
  }
}
