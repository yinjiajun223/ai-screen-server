import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { createChatModel, createNonStreamingModel } from '../../ai/model.js'
import { z } from 'zod'

export enum ActionTypeEnum {
  ADD_NODE = 'add_node', // 新增节点
  REMOVE_NODE = 'remove_node', // 删除节点
  UPDATE_NODE = 'update_node', // 更新节点
  ADD_DATA_SOURCE = 'add_data_source', // 新增数据源
  UPDATE_DATA_SOURCE = 'update_data_source', // 更新数据源
}

export const ActionSchemaType = z
  .enum([
    ActionTypeEnum.ADD_NODE,
    ActionTypeEnum.REMOVE_NODE,
    ActionTypeEnum.UPDATE_NODE,
    ActionTypeEnum.ADD_DATA_SOURCE,
    ActionTypeEnum.UPDATE_DATA_SOURCE,
  ])
  .describe(
    '用户在编辑页面时的操作类型，add_node = 新增节点，remove_node = 删除节点，update_node = 更新节点，add_data_source = 新增数据源，update_data_source = 更新数据源'
  )

export const PlanEditSchema = z.object({
  action: ActionSchemaType,
  id: z
    .string()
    .nullable()
    .describe(
      '要操作的节点或数据源的唯一标识符，比如用户要修改，那就是修改 节点/数据源 的真实 id；删除节点就是要删除 节点/数据源 的真实 id；新增节点或数据源时为 null'
    ),
  type: z.string().nullable().describe('节点的物料类型；数据源操作时为 null'),
  prompt: z.string().describe('传给后续执行节点的完整要求'),
})

export const handlePlanEdit = async state => {
  const materials = state.schema.material.map(item => {
    return {
      type: item.type,
      name: item.name,
    }
  })

  const materialTypeSchema = z.enum(materials.map(item => item.type)).describe('节点的类型，必须是可用物料中的类型')

  const taskPromptSchema = z.string().describe('传给节点生成或修改模型的提示词，包括内容、样式和布局要求等。')

  const modelPlanEditSchema = z.discriminatedUnion('action', [
    // 通过 action 字段区分不同的操作类型
    z.object({
      action: z.literal(ActionTypeEnum.ADD_NODE),
      id: z.null(),
      type: materialTypeSchema,
      prompt: taskPromptSchema,
    }),
    z.object({
      action: z.literal(ActionTypeEnum.UPDATE_NODE),
      id: z.string().describe('要修改的节点的 ID'),
      type: materialTypeSchema,
      prompt: taskPromptSchema,
    }),
    z.object({
      action: z.literal(ActionTypeEnum.REMOVE_NODE),
      id: z.string().describe('要删除的节点的 ID'),
      type: materialTypeSchema,
      prompt: taskPromptSchema,
    }),
    z.object({
      action: z.literal(ActionTypeEnum.ADD_DATA_SOURCE),
      id: z.uuid().describe('为新数据源生成的 UUID'),
      type: z.null(),
      prompt: taskPromptSchema,
    }),
    z.object({
      action: z.literal(ActionTypeEnum.UPDATE_DATA_SOURCE),
      id: z.string().describe('要修改的数据源的 ID'),
      type: z.null(),
      prompt: taskPromptSchema,
    }),
  ])

  const nodes = state.page.nodes.map(item => ({
    type: item.type,
    name: item.name,
  }))

  const dataSources = state.dataSources.map(item => ({
    id: item.id,
    name: item.name,
    type: item.type,
    dataDescription: item.dataDescription,
  }))

  const model = createNonStreamingModel().withStructuredOutput(
    z.object({
      editPlan: z.array(modelPlanEditSchema).describe('按执行顺序排列的 editPlan，每项只处理一个对象'),
      message: z.string().nullable().describe('给用户的消息，告诉用户缺少哪些信息；规划成功时为 null'),
    }),
    {
      name: 'edit_plan',
      method: 'jsonSchema',
    }
  )

  const result = await model.invoke([
    new SystemMessage(`
      请把用户要求整理成按执行顺序排列的 editPlan，每项只处理一个对象。
      节点编辑规则：
      - add_node 的 id 为 null。
      - update_node 和 remove_node 必须复制已有节点的真实 id 和 type。
      - 节点操作的 type 必须是可用物料中的真实类型。
      - 每项 prompt 必须能独立说明该节点的内容、样式和布局要求。

      数据源规则：
      - 用户要创建、添加、准备一份静态数据或 API 数据源时使用 add_data_source，type 为 null。
      - 用户要修改已有数据源的名称、数据或 API 配置时使用 update_data_source；从已有数据源中复制真实 id，type 为 null。
      - 用户要把已有数据源绑定、关联或应用到图表节点时使用 update_node，不要使用 update_data_source，也不要创建新的数据源。
      - 绑定数据源时，必须从已有节点复制目标节点的真实 id 和 type，并在 prompt 中写明数据源的真实 id、name 和 dataDescription。
      - 用户要根据已有数据源创建新图表时使用 add_node，id 为 null，type 为匹配的图表物料类型；在 prompt 中写明数据源的真实 id、name 和 dataDescription。
      - 无论是绑定已有图表，还是根据已有数据源创建图表，prompt 都必须要求把数据源的真实 id 写入节点 dataId。
      - 前端会根据节点 dataId 找到数据源，并将该数据源的 data 自动绑定到 ECharts 的 dataset.source；因此不要把完整数据复制到节点的 props.option.dataset.source。
      - 若无法确定目标节点或目标数据源，返回空 editPlan，并通过 message 询问用户。
      - 若无法确定要修改哪一个数据源，返回空 editPlan，并通过 message 询问目标数据源。
      - 不要把数据源操作理解为节点操作；只有用户明确要求图表、文本、指标等画布物料时才使用节点操作。
      - 用户不需要使用固定格式，也不需要主动说明 JSON、字段名或数据行。
      - prompt 必须明确这是 static 还是 api 数据源；修改时说明具体要改的内容，不要要求重新创建数据源，也不要改变数据源类型。

      - 创建数据源时，必须为 id 生成合法 UUID。
      - 数据源任务必须排在所有依赖它的节点任务之前。
      - 节点任务必须复制对应数据源的 UUID。
      - 节点任务必须要求把 UUID 写入节点 dataId。
      - 同一数据源供多个节点使用时，多个节点任务复制同一个 UUID。

      静态数据源规则：
      - 从自然语言中的业务对象、分类、指标和数值归纳出语义清楚且稳定的字段名。
      - 只有 data 行内的数据字段名必须使用有业务含义的英文 lowerCamelCase，不能使用中文；在 prompt 中明确英文键与中文含义，例如 month（月份）、salesAmount（销售额）。
      - 只转换字段名，数据中的名称、分类等文本值必须保留用户原文，不能翻译、缩写或改写。例如“一号泵”必须仍为“一号泵”。
      - 用户没有明确命名数据源时，根据业务主题生成简短名称，不要为名称追问；name 是展示名称，应沿用用户使用的语言，可以是中文。
      - 用户已经表达出各条实际数据时，把它们整理到 prompt；不能要求用户改写成结构化格式。
      - “是/否、需要/不需要”等明确的二元状态必须归纳为 boolean，明确表示没有值时归纳为 null，并在 prompt 中写清楚。
      - “示例、模拟、演示、随便生成几条”等表达都视为用户允许生成示例数据，并在 prompt 中保留这项授权。
      - 创建静态数据源时，只有用户既没有提供实际数据，也没有允许生成示例数据，才返回空 editPlan，并通过 message 询问数据内容或是否允许生成示例数据。修改已有数据源时可以只提供需要改的部分。

      API 数据源规则：
      - 用户提到 API、接口或 URL 时，规划为 api 数据源。
      - 创建 API 数据源必须有真实 URL；缺少 URL 时返回空 editPlan，并通过 message 询问接口地址。修改已有 API 数据源时保留原 URL，除非用户明确要求更改。
      - 创建 API 数据源且请求方式未说明时按 get 处理；修改时保留原请求方式，除非用户明确要求更改。
      - 创建 API 数据源时，用户提供了初始值或默认值就完整写入 prompt；没有提供时明确写为 null，不能猜测为数组或对象。修改时保留未提及的初始值。
      - 参数、响应数据路径和轮询间隔只有用户明确提供时才写入 prompt，不能猜测。
      - prompt 必须是后续生成步骤可独立理解的自然语言要求。创建静态数据源需明确名称、字段含义、实际数据或示例数据授权；创建 API 数据源需明确名称、URL、请求方式以及用户提供的可选配置。
      如果根据用户提示词无法完成要求，或者用户目标不明确，返回空 editPlan，并通过 message 一次问清楚；如果可以完成规划，则 message 返回 null。

      可用物料：${JSON.stringify(materials, null, 2)}
      已有节点：${JSON.stringify(nodes, null, 2)}
      已有数据源：${JSON.stringify(dataSources, null, 2)}
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
    currentTaskIndex: 0,
    actions: [],
    taskResults: [],
  }
}
