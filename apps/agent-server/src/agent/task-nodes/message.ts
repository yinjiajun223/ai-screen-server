import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { createChatModel } from '../../ai/model.js'

export const handleMessageTask = async state => {
  const model = createChatModel()

  const { page, selectedNodeIds, messages, schema } = state
  const { nodes, canvas } = page
  const { material, canvas: canvasSchema } = schema

  // 用户的最后一条消息是用户的问题，其他消息是上下文。我们需要将这些信息传递给模型，让它根据当前页面数据和选中节点回答用户的问题。
  const _messages = [...messages]
  const lastMessage = _messages.pop()

  const result = await model.invoke([
    new SystemMessage('你是一个 AI 大屏设计器助手，根据用户提供的消息进行回答'),
    ..._messages,
    new HumanMessage(`
    用户问题：${lastMessage.text}

    以下内容是编辑器的状态：

    ${JSON.stringify({ nodes, selectedNodeIds, canvas }, null, 2)}

    其中：
    - nodes：当前页面的全部节点。
    - selectedNodeIds：用户当前选中的节点，是 nodes 的子集。
    - canvas：当前画布的状态。

    以下内容是 canvas 画布的 schema：

    ${JSON.stringify(canvasSchema, null, 2)}

    以下是所有可用物料的 schema：

    ${JSON.stringify(material, null, 2)}
  `),
  ])

  return {
    // 注意，这个节点返回的 messages 会和 state.messages 自动合并，而不是覆盖。
    messages: result,
  }
}
