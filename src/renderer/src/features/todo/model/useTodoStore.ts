import { useUIStore } from "@renderer/stores/useUIStore";
import { DisplayTodo, TodoStatus } from "@shared/types/todo";
import { create } from "zustand";

type TodoState = {
  todos: DisplayTodo[];
  loading: boolean;
  error: string | null;
};

type TodoActions = {
  loadTodosByDate: (date: string) => Promise<void>;
  reorderTodo: (todoId: number, direction: "up" | "down") => Promise<boolean>;
  toggleCompletion: (todoId: number) => Promise<boolean>;
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
): TodoActions => ({
  // 특정일의 할일 조회회
  loadTodosByDate: async (date: string) => {
    set((state) => ({ loading: true, error: null }));
    try {
      const result = await window.api.getTodosByDate(date);
      if (!result.success)
        throw new Error(result.error ?? "일별 데이터 조회 실패");
      set((state) => ({ todos: result.data ?? [] }));
    } catch (err) {
      set((state) => ({
        error: err instanceof Error ? err.message : "데이터 로드 실패",
      }));
    } finally {
      set((state) => ({ loading: false }));
    }
  },
  // 특정일의 할일 순서 변경
  reorderTodo: async (todoId, direction) => {
    const current = get().todos;
    const index = current.findIndex((todo) => todo.id === todoId);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || swapIndex < 0 || swapIndex >= current.length) {
      return false;
    }
    const previousTodos = current;
    const next = [...current];
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];

    // 1) 화면 먼저 바꿈 (낙관적 업데이트)
    set((state) => ({ todos: next, error: null }));

    const activeDate = useUIStore.getState().activeDate;
    const result = await window.api.reorderTodo({
      target_date: activeDate,
      id: todoId,
      direction,
    });
    // 2) 실패하면 되돌림
    if (!result.success) {
      set((state) => ({
        todos: previousTodos,
        error: result.error ?? "순서 변경 실패",
      }));
      return false;
    }
    return true;
  },
  // 할일 상태 변경
  toggleCompletion: async (todoId) => {
    const flipCompletionStatus = (status: TodoStatus): TodoStatus | null => {
      if (status === "pending") return "completed";
      if (status === "completed") return "pending";
      return null;
    };

    const current = get().todos;
    const target = current.find((todo) => todo.id === todoId);
    const nextStatus = target ? flipCompletionStatus(target.status) : null;
    if (!target || !nextStatus) {
      return false;
    }
    const previousTodos = current;
    // 1) 화면 먼저 (낙관적 업데이트)
    set((state) => ({
      todos: current.map((todo) =>
        todo.id === todoId ? { ...todo, status: nextStatus } : todo,
      ),
      error: null,
    }));
    // 2) DB 변경 (IPC → main → SQLite)
    const result = await window.api.toggleCompletion(todoId);
    // 3) 실패 시 화면 되돌림
    if (!result.success) {
      set((state) => ({
        todos: previousTodos,
        error: result.error ?? "상태 변경 실패",
      }));
      return false;
    }
    return true;
  },
  //
});

export const useTodoStore = create<TodoStore>()((set, get) => ({
  ...initialState,
  ...createActions(set, get),
}));
