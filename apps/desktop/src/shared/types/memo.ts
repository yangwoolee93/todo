/** id는 기기 간 병합을 위한 전역 고유 문자열(UUID)이다. */
export interface MemoCategory {
  id: string;
  name: string;
  sort_order: number;
  color: string;
}

export interface MemoItem {
  id: string;
  category_id: string;
  title: string;
  note: string;
  created_at: number;
  sort_order: number;
}

export interface CreateMemoPayload {
  category_id: string;
  title: string;
  note: string;
}

export interface UpdateMemoPayload {
  id: string;
  category_id: string;
  title: string;
  note: string;
}
