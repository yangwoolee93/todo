export type GoogleAuthStatus = {
  configured: boolean;
  connected: boolean;
  email: string | null;
  last_synced_at: number | null;
};

export type GoogleSyncResult = {
  added: number;
  updated: number;
  deleted: number;
  last_synced_at: number;
};
