// 修改大屏内容

import { AIMessage } from '@langchain/core/messages'

export const handleEditTask = async () => {
  return {
    messages: [
      new AIMessage(`接到任务：根据用户的需求，需要对当前画布进行修改。`),
    ],
  }
}
