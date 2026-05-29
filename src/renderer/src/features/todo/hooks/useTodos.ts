import { DisplayTodo } from "@shared/types/todo";
import { useTodoStore } from "../model/useTodoStore";

interface UseTodoReturn {
  todos: DisplayTodo[];
  loading: boolean;
}

export function useTodos(): UseTodoReturn {
  const todos = useTodoStore((state) => state.todos);
  const loading = useTodoStore((state) => state.loading);
  return {
    todos,
    loading,
  };
}
// ?????? 껍대긴데 실제 안사용될듯 이걸로
