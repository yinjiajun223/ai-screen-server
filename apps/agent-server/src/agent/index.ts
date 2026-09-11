import { END, START, StateGraph } from '@langchain/langgraph'
import { State } from './state.js'
import { answerMessage } from './answerMessage.js'

const builder = new StateGraph(State)
  .addNode('answerMessage', answerMessage)
  .addEdge(START, 'answerMessage')
  .addEdge('answerMessage', END)

// 将图定义编译成可调用的 Runnable，供服务层执行或流式调用。
export const graph = builder.compile()

// 设置可读名称，便于在日志、追踪和调试工具中识别这张图。
graph.name = 'ScreenDesignGraph'
