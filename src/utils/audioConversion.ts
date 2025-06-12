import toWav from 'audiobuffer-to-wav';

export interface ConversionResult {
  blob: Blob;
  originalFormat: string;
  converted: boolean;
}

/**
 * Converts audio blob to WAV format if needed for Whisper compatibility
 */
export async function convertToWavIfNeeded(blob: Blob): Promise<ConversionResult> {
  const originalFormat = blob.type || 'unknown';
  
  console.log('🔄 Checking audio format:', originalFormat);
  
  // Check if the format is already compatible with Whisper
  const compatibleFormats = [
    'audio/wav',
    'audio/wave', 
    'audio/x-wav',
    'audio/mpeg',
    'audio/mp3',
    'audio/ogg',
    'audio/flac',
    'audio/m4a',
    'audio/aac'
  ];
  
  const isCompatible = compatibleFormats.some(format => 
    originalFormat.toLowerCase().includes(format.toLowerCase())
  );
  
  // If it's already compatible, return as-is
  if (isCompatible && !originalFormat.includes('webm')) {
    console.log('✅ Audio format is compatible, no conversion needed');
    return {
      blob,
      originalFormat,
      converted: false
    };
  }
  
  console.log('🔄 Converting audio to WAV format...');
  
  try {
    // Convert blob to ArrayBuffer
    const arrayBuffer = await blob.arrayBuffer();
    
    // Create audio context and decode audio data
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    console.log('🎵 Audio decoded:', {
      sampleRate: audioBuffer.sampleRate,
      duration: audioBuffer.duration,
      channels: audioBuffer.numberOfChannels
    });
    
    // Convert to WAV using audiobuffer-to-wav
    const wavArrayBuffer = toWav(audioBuffer);
    const wavBlob = new Blob([wavArrayBuffer], { type: 'audio/wav' });
    
    console.log('✅ Audio converted to WAV:', {
      originalSize: blob.size,
      convertedSize: wavBlob.size,
      originalFormat,
      newFormat: 'audio/wav'
    });
    
    return {
      blob: wavBlob,
      originalFormat,
      converted: true
    };
  } catch (error) {
    console.error('❌ Audio conversion failed:', error);
    throw new Error(`Failed to convert audio from ${originalFormat} to WAV: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Checks if an audio format might need conversion and returns a warning message
 */
export function getFormatWarning(mimeType: string): string | null {
  const problematicFormats = [
    'audio/webm',
    'audio/x-m4a',
    'audio/mp4',
    'audio/3gpp',
    'audio/amr'
  ];
  
  const needsWarning = problematicFormats.some(format => 
    mimeType.toLowerCase().includes(format.toLowerCase())
  );
  
  if (needsWarning || !mimeType.startsWith('audio/')) {
    return `This file format (${mimeType || 'unknown'}) may require conversion to WAV for optimal transcription. The app will attempt automatic conversion, but transcription may fail for some formats.`;
  }
  
  return null;
}

/**
 * Gets a user-friendly format name
 */
export function getFormatDisplayName(mimeType: string): string {
  const formatMap: Record<string, string> = {
    'audio/wav': 'WAV',
    'audio/wave': 'WAV', 
    'audio/x-wav': 'WAV',
    'audio/mpeg': 'MP3',
    'audio/mp3': 'MP3',
    'audio/ogg': 'OGG',
    'audio/webm': 'WebM',
    'audio/m4a': 'M4A',
    'audio/aac': 'AAC',
    'audio/flac': 'FLAC',
    'audio/x-m4a': 'M4A',
    'audio/mp4': 'MP4'
  };
  
  for (const [mime, display] of Object.entries(formatMap)) {
    if (mimeType.toLowerCase().includes(mime)) {
      return display;
    }
  }
  
  return mimeType || 'Unknown';
}