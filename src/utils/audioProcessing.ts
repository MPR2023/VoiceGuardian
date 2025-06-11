export const processAudioFile = (file: File | Blob): Promise<WaveformData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const channelData = audioBuffer.getChannelData(0);
        const samples = 1000; // Number of peaks to generate
        const blockSize = Math.floor(channelData.length / samples);
        const peaks: number[] = [];
        
        for (let i = 0; i < samples; i++) {
          let peak = 0;
          for (let j = 0; j < blockSize; j++) {
            const sample = Math.abs(channelData[i * blockSize + j] || 0);
            if (sample > peak) peak = sample;
          }
          peaks.push(peak);
        }
        
        resolve({
          peaks,
          duration: audioBuffer.duration
        });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const generateMockFlags = (duration: number): FlaggedTimestamp[] => {
  const flags: FlaggedTimestamp[] = [];
  const severities: ('critical' | 'warning' | 'info' | 'review')[] = ['critical', 'warning', 'info', 'review'];
  const labels = [
    'Profanity detected',
    'Aggressive tone',
    'Personal information',
    'Quality issue',
    'Background noise',
    'Voice stress indicators',
    'Compliance violation',
    'Content review needed'
  ];
  
  const numFlags = Math.floor(Math.random() * 8) + 3;
  
  for (let i = 0; i < numFlags; i++) {
    flags.push({
      id: `flag-${i}`,
      timestamp: Math.random() * duration,
      label: labels[Math.floor(Math.random() * labels.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      description: 'Automated analysis detected potential issue requiring review.',
      confidence: Math.random() * 0.4 + 0.6 // 60-100% confidence
    });
  }
  
  return flags.sort((a, b) => a.timestamp - b.timestamp);
};

export interface WaveformData {
  peaks: number[];
  duration: number;
}

export interface FlaggedTimestamp {
  id: string;
  timestamp: number;
  label: string;
  severity: 'critical' | 'warning' | 'info' | 'review';
  description: string;
  confidence: number;
}