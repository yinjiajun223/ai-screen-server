import { END, START, StateGraph } from '@langchain/langgraph'
import { State } from './state.js'
import { handleEditTask, handleMessageTask, handlePageTask, handleEditorResult, handlePlanEdit } from './task-nodes/index.js'
import { classifyTask } from './classification.js'

const builder = new StateGraph(State)
  .addNode('classifyTask', classifyTask) // 意图识别节点
  .addNode('handleMessageTask', handleMessageTask)
  .addNode('handlePageTask', handlePageTask)
  .addNode('handleEditTask', handleEditTask)
  .addNode('handlePlanEdit', handlePlanEdit)
  .addNode('handleEditorResult', handleEditorResult)
  .addEdge(START, 'classifyTask')
  .addConditionalEdges('classifyTask', state => state.classification.task, {
    message: 'handleMessageTask',
    page: 'handlePageTask',
    edit: 'handlePlanEdit',
  })
  .addEdge('handleMessageTask', END)
  .addEdge('handlePageTask', END)
  .addConditionalEdges('handlePlanEdit', state => (state.editPlan.length > 0 ? 'handleEditTask' : END))
  .addEdge('handleEditTask', 'handleEditorResult')
  .addEdge('handleEditorResult', END)

// 将图定义编译成可调用的 Runnable，供服务层执行或流式调用。
export const graph = builder.compile()

// 设置可读名称，便于在日志、追踪和调试工具中识别这张图。
graph.name = 'ScreenDesignGraph'
