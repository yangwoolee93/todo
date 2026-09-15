export interface MemoCategory {
  id: number;
  name: string;
  sort_order: number;
  color: string;
}

export interface MemoItem {
  id: number;
  category_id: number;
  title: string;
  note: string;
  created_at: number;
  sort_order: number;
}

export interface CreateMemoPayload {
  category_id: number;
  title: string;
  note: string;
}

export interface UpdateMemoPayload {
  id: number;
  category_id: number;
  title: string;
  note: string;
}
