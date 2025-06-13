import { pipeline } from '@xenova/transformers';
import { convertToWavIfNeeded } from '../utils/audioConversion';

export interface TranscriptionWord {
  start: number;
  end: number;
  word: string;
}

export interface TranscriptionResult {
  words: TranscriptionWord[];
  text: string;
}

let transcriber: any = null;

export async function transcribeAudioServer(blob: Blob, model = "whisper-base"): Promise<string> {
  const url = `${import.meta.env.VITE_TRANSCRIBE_API}?model=${model}`;
  
  console.log('🌐 Sending audio to transcription server:', url);
  
  try {
    // Convert to WAV for optimal server compatibility
    const conversionResult = await convertToWavIfNeeded(blob);
    const audioBlob = conversionResult.blob;
    
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.wav');
    
    const res = await fetch(url, { 
      method: 'POST', 
      body: formData 
    });
    
    if (!res.ok) {
      throw new Error(`Transcription API error: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();
    console.log('✅ Server transcription response:', data);
    
    return data.transcription?.text || data.text || "";
  } catch (error) {
    console.error('❌ Server transcription failed:', error);
    throw new Error(`Server transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function transcribeAudioBrowser(blob: Blob): Promise<TranscriptionResult> {
  console.log('🎤 Starting browser transcription with blob size:', blob.size);
  
  // UNIVERSAL CONVERSION: Always convert to WAV before sending to Whisper
  console.log('🔄 Ensuring audio is in WAV format for Whisper...');
  let processedBlob: Blob;
  
  try {
    const conversionResult = await convertToWavIfNeeded(blob);
    processedBlob = conversionResult.blob;
    
    if (conversionResult.converted) {
      console.log('✅ Audio converted to WAV for Whisper compatibility');
    } else {
      console.log('✅ Audio already in compatible format');
    }
  } catch (conversionError) {
    console.error('❌ Audio conversion failed:', conversionError);
    throw new Error(`Audio conversion failed: ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}`);
  }
  
  // Debug: Log blob type
  console.log("Processed blob type:", processedBlob.type);
  
  // Debug: Log first 100 bytes using FileReader
  const reader = new FileReader();
  const firstBytes = processedBlob.slice(0, 100);
  const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(firstBytes);
  });
  const uint8Array = new Uint8Array(arrayBuffer);
  console.log("First 100 bytes:", uint8Array);
  
  try {
    // Lazy-load the pipeline if not already loaded
    if (!transcriber) {
      console.log('📥 Loading Whisper model...');
      try {
        transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
          trust_remote_code: true,   // allow loading custom code if needed
          dtype: 'fp32',
          device: 'cpu'
        });
        console.log('✅ Whisper model loaded successfully');
      } catch (modelError) {
        console.error('❌ Model loading failed:', modelError);
        throw new Error('Failed to load AI transcription model. Please check your internet connection and try again.');
      }
    }

    // Convert blob to array buffer for processing
    console.log('🔄 Converting processed audio blob to array buffer...');
    const fullArrayBuffer = await processedBlob.arrayBuffer();
    console.log('✅ Audio converted, size:', fullArrayBuffer.byteLength);
    
    // Debug: Decode audio to check sampleRate and duration
    console.log('🎵 Decoding audio with Web Audio API...');
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(fullArrayBuffer.slice(0));
    console.log("Sample rate:", audioBuffer.sampleRate);
    console.log("Duration:", audioBuffer.duration);
    
    // Run transcription with word-level timestamps
    console.log('🎯 Running transcription on processed audio...');
    const result = await transcriber(fullArrayBuffer, {
      return_timestamps: 'word',
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    console.log('🎤 Raw transcription result:', result);

    // Extract text and word-level timestamps
    const text = result.text || '';
    const words: TranscriptionWord[] = [];

    if (result.chunks && Array.isArray(result.chunks)) {
      console.log('📝 Processing', result.chunks.length, 'chunks');
      for (const chunk of result.chunks) {
        if (chunk.timestamp && Array.isArray(chunk.timestamp) && chunk.timestamp.length === 2) {
          words.push({
            start: chunk.timestamp[0],
            end: chunk.timestamp[1],
            word: chunk.text.trim()
          });
        }
      }
    }

    console.log('✅ Browser transcription complete:', { text: text.substring(0, 100) + '...', wordCount: words.length });

    return {
      words,
      text
    };
  } catch (error) {
    console.error('❌ Full browser transcription error:', error);
    throw error;  // bubble up the real failure
  }
}

// Main transcription function that uses server by default
export async function transcribeAudio(blob: Blob, useServer = true): Promise<TranscriptionResult> {
  if (useServer) {
    try {
      console.log('🌐 Attempting server transcription...');
      const text = await transcribeAudioServer(blob);
      
      // Convert server response to TranscriptionResult format
      // Note: Server transcription doesn't provide word-level timestamps
      return {
        text,
        words: [] // Server transcription doesn't provide word timestamps
      };
    } catch (serverError) {
      console.warn('❌ Server transcription failed, falling back to browser:', serverError);
      
      // Fallback to browser transcription
      return await transcribeAudioBrowser(blob);
    }
  } else {
    console.log('🖥️ Using browser transcription (privacy mode)');
    return await transcribeAudioBrowser(blob);
  }
}

export async function transcribeWithWebSpeech(blob?: Blob): Promise<{ text: string }> {
  return new Promise((resolve, reject) => {
    // Check if Web Speech API is supported
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      reject(new Error('Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.'));
      return;
    }

    // If blob is provided, inform user it's not supported
    if (blob) {
      reject(new Error('Browser-based transcription does not support pre-recorded audio files. Please use the microphone recording feature instead.'));
      return;
    }

    const recognition = new SpeechRecognition();
    
    // Configure recognition
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    let finalTranscript = '';
    let isListening = false;

    recognition.onstart = () => {
      isListening = true;
      console.log('Web Speech API: Started listening');
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Web Speech API error:', event.error);
      
      let errorMessage = 'Speech recognition failed. ';
      switch (event.error) {
        case 'no-speech':
          errorMessage += 'No speech was detected. Please try speaking clearly.';
          break;
        case 'audio-capture':
          errorMessage += 'No microphone was found. Please check your microphone permissions.';
          break;
        case 'not-allowed':
          errorMessage += 'Microphone permission was denied. Please allow microphone access and try again.';
          break;
        case 'network':
          errorMessage += 'Network error occurred. Please check your internet connection.';
          break;
        default:
          errorMessage += 'Please try again.';
      }
      
      reject(new Error(errorMessage));
    };

    recognition.onend = () => {
      isListening = false;
      console.log('Web Speech API: Stopped listening');
      
      if (finalTranscript.trim()) {
        resolve({ text: finalTranscript.trim() });
      } else {
        reject(new Error('No speech was detected. Please try speaking clearly and ensure your microphone is working.'));
      }
    };

    // Start recognition
    try {
      recognition.start();
      
      // Auto-stop after 30 seconds to prevent indefinite listening
      setTimeout(() => {
        if (isListening) {
          recognition.stop();
        }
      }, 30000);
      
    } catch (error) {
      reject(new Error('Failed to start speech recognition. Please try again.'));
    }
  });
}