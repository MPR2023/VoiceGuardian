export interface AudioFile {
  id: string;
  name: string;
  duration: number;
  size: number;
  url: string;
  uploadedAt: Date;
}

export interface FlaggedTimestamp {
  id: string;
  timestamp: number;
  label: string;
  severity: 'critical' | 'warning' | 'info' | 'review';
  description: string;
  confidence: number;
  // New fields for FlagCard compatibility
  category?: 'Profanity' | 'Compliance' | 'Quality';
  snippet?: string;
  flaggedPhrase?: string;
  speaker?: string;
  policyLink?: string;
  history?: Array<{ reviewer: string; note: string; date: string }>;
  startTime?: number;
  endTime?: number;
}

export interface WaveformData {
  peaks: number[];
  duration: number;
}