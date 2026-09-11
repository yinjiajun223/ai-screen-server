import { z } from 'zod'
import { createChatModel } from '../ai/model.js'
import { SystemMessage } from '@langchain/core/messages'
import { getLastUserMessage } from '../utils/index.js'

// 意图识别
export const ClassificationSchema = z.object({
  task: z
    .enum(['message', 'page', 'edit'])
    .describe(
      '识别用户意图的任务分类，message = 普通问答，page = 创建页面，edit = 修改页面'
    ),
})

// 根据用户输入的内容，识别用户的意图，并返回相应的任务类型
export async function classifyTask(state) {
  const chatModel = createChatModel({disableStreaming: true})

  const model = chatModel.withStructuredOutput(ClassificationSchema, {
    name: 'task_classification',
    method: 'jsonSchema',
  })

  const response = await model.invoke(
    [
      new SystemMessage(`
        你是一个 AI 大屏设计器助手，根据用户提示词进行意图识别。
        分类结果只能是 message、page、edit：
        - message：普通问答，尤其是询问当前页面、节点或数据源事实。
        - page：创建一个完整页面或大屏。
        - edit：修改当前页面。
      `),
      getLastUserMessage(state.messages),
    ],
    {
      tags: ['nostream'], // 这个节点不需要流式输出，直接返回最终结果即可
    }
  )

  const { task } = response

  return {
    classification: {
      task,
    },
  }
}
