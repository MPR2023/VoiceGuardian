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
}

export interface WaveformData {
  peaks: number[];
  duration: number;
}