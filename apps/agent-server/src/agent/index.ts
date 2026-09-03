import { END, START, StateGraph } from '@langchain/langgraph'
import { createChatModel } from '../ai/model.js'
import { State } from './state.js'

const answerMessage = async state => {
  const model = createChatModel()
  const result = await model.invoke(state.messages)

  return {
    // 注意，这个节点返回的 messages 会和 state.messages 自动合并，而不是覆盖。
    messages: result,
  }
}

const builder = new StateGraph(State)
  .addNode('answerMessage', answerMessage)
  .addEdge(START, 'answerMessage')
  .addEdge('answerMessage', END)

// 将图定义编译成可调用的 Runnable，供服务层执行或流式调用。
export const graph = builder.compile()

// 设置可读名称，便于在日志、追踪和调试工具中识别这张图。
graph.name = 'ScreenDesignGraph'
