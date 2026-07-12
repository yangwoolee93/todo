import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import type { TodoDatabase } from "@shared/types/todo";

/** JSON 저장 파일명 */
const STORE_FILE_NAME = "todos.json";

/** 빈 저장소 기본값 */
const EMPTY_STORE: TodoDatabase = { todos: [] };

/**
 * userData 경로에 저장된 JSON 파일의 전체 경로를 반환한다.
 */
export function getStoreFilePath(): string {
  return join(app.getPath("userData"), STORE_FILE_NAME);
}

/**
 * 디스크에서 TodoDatabase를 읽어온다.
 * 파일이 없으면 빈 저장소를 반환한다.
 */
export function readStore(): TodoDatabase {
  const filePath = getStoreFilePath();

  if (!existsSync(filePath)) {
    return structuredClone(EMPTY_STORE);
  }

  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as TodoDatabase;

    if (!parsed.todos || !Array.isArray(parsed.todos)) {
      return structuredClone(EMPTY_STORE);
    }

    return parsed;
  } catch {
    return structuredClone(EMPTY_STORE);
  }
}

/**
 * TodoDatabase 전체를 디스크에 atomic하게 저장한다.
 * @param store - 저장할 데이터
 */
export function writeStore(store: TodoDatabase): void {
  const filePath = getStoreFilePath();
  const dir = dirname(filePath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(filePath, JSON.stringify(store, null, 2), "utf-8");
}

/**
 * 저장소를 읽고, 변경 함수를 적용한 뒤 다시 저장하는 헬퍼.
 * @param mutator - store.todos 배열을 변경하는 함수
 */
export function mutateStore(mutator: (store: TodoDatabase) => void): TodoDatabase {
  const store = readStore();
  mutator(store);
  writeStore(store);
  return store;
}
