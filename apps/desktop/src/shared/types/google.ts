export type GoogleAuthStatus = {
  configured: boolean;
  connected: boolean;
  email: string | null;
  last_synced_at: number | null;
  logging_in: boolean;
  syncing: boolean;
  drive_granted: boolean;
};

export type GoogleSyncResult = {
  added: number;
  updated: number;
  deleted: number;
  last_synced_at: number;
};
