import { arrayMove } from "@dnd-kit/sortable";
import { useUIStore } from "@renderer/stores/useUIStore";
import {
  CreateTodoMonthPayload,
  CreateTodoRangePayload,
  DisplayTodo,
  TodoItem,
  TodoStatus,
} from "@shared/types/todo";
import { create } from "zustand";

function sortTodos(items: DisplayTodo[]): DisplayTodo[] {
  return [...items].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.created_at - b.created_at;
  });
}

function toDisplay(item: TodoItem): DisplayTodo {
  return {
    id: item.id,
    content: item.content,
    status: item.status,
    sort_order: item.sort_order,
    created_at: item.created_at,
    batch_id: item.batch_id,
  };
}

type TodoState = {
  todos: DisplayTodo[];
  loading: boolean;
  error: string | null;
};

type TodoActions = {
  loadTodosByDate: (date: string) => Promise<void>;
  moveTodo: (activeId: number, overId: number) => Promise<boolean>;
  clearError: () => void;
  toggleCompletion: (todoId: number) => Promise<boolean>;
  setTodoStatus: (todoId: number, status: TodoStatus) => Promise<boolean>;
  deleteTodo: (todoId: number, scope: "day" | "batch") => Promise<boolean>;
  updateTodoContent: (todoId: number, content: string) => Promise<boolean>;
  createTodo: (content: string, targetDate: string) => Promise<boolean>;
  createTodoRange: (payload: CreateTodoRangePayload) => Promise<boolean>;
  createTodoMonth: (payload: CreateTodoMonthPayload) => Promise<boolean>;
};

type TodoStore = TodoState & TodoActions;

const initialState: TodoState = {
  todos: [],
  loading: true,
  error: null,
};

const createActions = (
  set: (fn: (prev: TodoStore) => Partial<TodoStore>) => void,
  get: () => TodoStore,
): TodoActions => {
  const syncDaily = async () => {
    const activeDate = useUIStore.getState().activeDate;
    const result = await window.api.getTodosByDate(activeDate);
    if (result.success) set(() => ({ todos: result.data ?? [] }));
  };

  return {
    loadTodosByDate: async (date) => {
      set(() => ({ loading: true, error: null }));
      try {
        const result = await window.api.getTodosByDate(date);
        if (!result.success)
          throw new Error(result.error ?? "일별 데이터 조회 실패");
        set(() => ({ todos: result.data ?? [] }));
      } catch (err) {
        set(() => ({
          error: err instanceof Error ? err.message : "데이터 로드 실패",
        }));
      } finally {
        set(() => ({ loading: false }));
      }
    },

    moveTodo: async (activeId, overId) => {
      const current = get().todos;
      const fromIndex = current.findIndex((todo) => todo.id === activeId);
      const toIndex = current.findIndex((todo) => todo.id === overId);
      if (fromIndex === -1 || toIndex === -1) return false;
      if (fromIndex === toIndex) return true;

      const previousTodos = current;
      const sortOrders = current.map((t) => t.sort_order).sort((a, b) => a - b);
      const next = arrayMove(current, fromIndex, toIndex).map((item, index) => ({
        ...item,
        sort_order: sortOrders[index],
      }));
      set(() => ({ todos: next, error: null }));

      const activeDate = useUIStore.getState().activeDate;
      const result = await window.api.reorderTodo({
        target_date: activeDate,
        id: activeId,
        over_id: overId,
      });
      if (!result.success) {
        set(() => ({ todos: previousTodos, error: result.error ?? "순서 변경 실패" }));
        return false;
      }
      return true;
    },

    clearError: () => set(() => ({ error: null })),

    toggleCompletion: async (todoId) => {
      const flip = (s: TodoStatus): TodoStatus | null =>
        s === "pending" ? "completed" : s === "completed" ? "pending" : null;

      const current = get().todos;
      const target = current.find((t) => t.id === todoId);
      const nextStatus = target ? flip(target.status) : null;
      if (!target || !nextStatus) return false;

      const previousTodos = current;
      set(() => ({
        todos: current.map((t) =>
          t.id === todoId ? { ...t, status: nextStatus } : t,
        ),
        error: null,
      }));

      const result = await window.api.toggleCompletion(todoId);
      if (!result.success) {
        set(() => ({ todos: previousTodos, error: result.error ?? "상태 변경 실패" }));
        return false;
      }
      return true;
    },

    setTodoStatus: async (todoId, status) => {
      const current = get().todos;
      const target = current.find((t) => t.id === todoId);
      if (!target || target.status === status) return false;

      const previousTodos = current;
      set(() => ({
        todos: current.map((t) => (t.id === todoId ? { ...t, status } : t)),
        error: null,
      }));

      const result = await window.api.setTodoStatus({ id: todoId, status });
      if (!result.success) {
        set(() => ({ todos: previousTodos, error: result.error ?? "상태 변경 실패" }));
        return false;
      }
      return true;
    },

    deleteTodo: async (todoId, scope) => {
      if (scope === "batch") {
        const result = await window.api.deleteTodo({ id: todoId, scope });
        if (!result.success) {
          set(() => ({ error: result.error ?? "삭제 실패" }));
          return false;
        }
        await syncDaily();
        return true;
      }

      const current = get().todos;
      const previousTodos = current;
      set(() => ({
        todos: current.filter((t) => t.id !== todoId),
        error: null,
      }));

      const result = await window.api.deleteTodo({ id: todoId, scope: "day" });
      if (!result.success) {
        set(() => ({ todos: previousTodos, error: result.error ?? "삭제 실패" }));
        return false;
      }
      return true;
    },

    updateTodoContent: async (todoId, content) => {
      const current = get().todos;
      const target = current.find((t) => t.id === todoId);
      if (!target) return false;

      const result = await window.api.updateTodoContent({ id: todoId, content });
      if (!result.success) {
        set(() => ({ error: result.error ?? "수정 실패" }));
        return false;
      }

      if (target.batch_id) {
        await syncDaily();
      } else {
        set(() => ({
          todos: current.map((t) => (t.id === todoId ? { ...t, content } : t)),
        }));
      }
      return true;
    },

    createTodo: async (content, targetDate) => {
      const result = await window.api.createTodo({
        content,
        target_date: targetDate,
      });
      if (!result.success || !result.data) {
        set(() => ({ error: result.error ?? "생성 실패" }));
        return false;
      }

      const activeDate = useUIStore.getState().activeDate;
      if (result.data.target_date === activeDate) {
        const created = toDisplay(result.data);
        set((state) => ({ todos: sortTodos([...state.todos, created]) }));
      }
      return true;
    },

    createTodoRange: async (payload) => {
      const result = await window.api.createTodoRange(payload);
      if (!result.success) {
        set(() => ({ error: result.error ?? "기간 일괄 생성 실패" }));
        return false;
      }
      await syncDaily();
      return true;
    },

    createTodoMonth: async (payload) => {
      const result = await window.api.createTodoMonth(payload);
      if (!result.success) {
        set(() => ({ error: result.error ?? "한 달 일괄 생성 실패" }));
        return false;
      }
      await syncDaily();
      return true;
    },
  };
};

export const useTodoStore = create<TodoStore>()((set, get) => ({
  ...initialState,
  ...createActions(set, get),
}));
