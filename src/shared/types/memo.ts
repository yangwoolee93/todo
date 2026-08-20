export type MemoKind = "routine" | "planned";

export interface MemoItem {
  id: number;
  kind: MemoKind;
  title: string;
  note: string;
  created_at: number;
  sort_order: number;
}

export interface CreateMemoPayload {
  kind: MemoKind;
  title: string;
  note: string;
}

export interface UpdateMemoPayload {
  id: number;
  title: string;
  note: string;
}
