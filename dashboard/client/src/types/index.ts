export interface GitFile {
  name: string;
  status: string;
  path?: string;
  fullName?: string;
}

export interface HistoryItem {
  date: string;
  files: GitFile[];
}

export interface WorkspaceConfig {
  monitorFolder: string;
  availableFolders?: string[];
  excludeFolders?: string[];
}

export interface FilePreviewData {
  fileName: string;
  filePath: string;
  extension: string;
  kind: 'markdown' | 'text' | 'image' | 'pdf' | 'unknown';
  mimeType: string;
  size: number;
  content?: string;
  dataUrl?: string;
}

export interface OpencodeUsageRow {
  model: string;
  messageValue: number;
  usageValue: number;
  message: string;
  inTokens: string;
  outTokens: string;
  cacheRead: string;
}

export interface LinkItem {
  id: string;
  title: string;
  url: string;
  note: string;
  tag: string;
}
