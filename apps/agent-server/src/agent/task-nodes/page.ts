// 一句话生成大屏

import { AIMessage } from '@langchain/core/messages'

export const handlePageTask = async () => {
  return {
    messages: [
      new AIMessage(`接到任务：根据用户的需求，生成一个大屏页面设计方案。`),
    ],
  }
}
