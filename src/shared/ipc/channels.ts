/**
 * Main ↔ Renderer IPC 채널 이름 상수
 */
export const IPC_CHANNELS = {
  GET_TODOS_BY_DATE: "todo:getByDate",
  GET_MONTH_SUMMARY: "todo:getMonthSummary",
  CREATE_TODO: "todo:create",
  CREATE_TODO_RANGE: "todo:createRange",
  CREATE_TODO_MONTH: "todo:createMonth",
  SET_TODO_STATUS: "todo:setStatus",
  TOGGLE_COMPLETION: "todo:toggleCompletion",
  DELETE_TODO: "todo:delete",
  UPDATE_TODO_CONTENT: "todo:updateContent",
  REORDER_TODO: "todo:reorder",
  EXPORT_JSON: "data:exportJson",
  EXPORT_SQL: "data:exportSql",
  IMPORT_JSON: "data:importJson",
  SET_TITLE_BAR_OVERLAY: "window:setTitleBarOverlay",
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
