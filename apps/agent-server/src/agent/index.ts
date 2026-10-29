import { END, START, StateGraph } from '@langchain/langgraph'
import { State } from './state.js'
import {
  handleEditTask,
  handleMessageTask,
  handlePageTask,
  handleEditorResult,
  handlePlanEdit,
  handleDataSourceTask,
} from './task-nodes/index.js'
import { classifyTask } from './classification.js'
import { ActionTypeEnum } from './task-nodes/planEdit.ts'

const routeTask = state => {
  if (state.editPlan.length === 0) return END // 没有任务了，直接结束

  const task = state.editPlan[state.currentTaskIndex]

  if (!task) return 'handleEditorResult' // 没有任务了，直接结束

  if ([ActionTypeEnum.ADD_DATA_SOURCE, ActionTypeEnum.UPDATE_DATA_SOURCE].includes(task.action)) return 'handleDataSourceTask' // 处理数据源任务

  return 'handleEditTask' // 处理节点编辑任务
}

const builder = new StateGraph(State)
  .addNode('classifyTask', classifyTask) // 意图识别节点
  .addNode('handleMessageTask', handleMessageTask)
  .addNode('handlePageTask', handlePageTask)
  .addNode('handleEditTask', handleEditTask)
  .addNode('handlePlanEdit', handlePlanEdit)
  .addNode('handleEditorResult', handleEditorResult)
  .addNode('handleDataSourceTask', handleDataSourceTask)
  .addEdge(START, 'classifyTask')
  .addConditionalEdges('classifyTask', state => state.classification.task, {
    message: 'handleMessageTask',
    page: 'handlePageTask',
    edit: 'handlePlanEdit',
  })
  .addConditionalEdges('handlePlanEdit', routeTask)
  .addConditionalEdges('handleDataSourceTask', routeTask)
  .addConditionalEdges('handleEditTask', routeTask)
  .addEdge('handleMessageTask', END)
  .addEdge('handlePageTask', END)
  .addEdge('handleEditorResult', END)

// 将图定义编译成可调用的 Runnable，供服务层执行或流式调用。
export const graph = builder.compile()

// 设置可读名称，便于在日志、追踪和调试工具中识别这张图。
graph.name = 'ScreenDesignGraph'
