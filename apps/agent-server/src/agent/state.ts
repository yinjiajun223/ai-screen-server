import { MessagesValue, StateSchema } from '@langchain/langgraph'

export const State = new StateSchema({
  // MessagesValue 会保存对话消息，注意，这哥们会在节点返回消息时自动合并，而不是更新
  messages: MessagesValue,
})
