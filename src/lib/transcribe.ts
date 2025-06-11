import { pipeline } from '@xenova/transformers';

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

export async function transcribeAudio(blob: Blob): Promise<TranscriptionResult> {
  try {
    // Lazy-load the pipeline if not already loaded
    if (!transcriber) {
      try {
        transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
      } catch (modelError) {
        console.error('Model loading failed:', modelError);
        throw new Error('Model loading failed. Please check your internet connection, or try reloading the page. If the problem persists, try our deployed site or contact support.');
      }
    }

    // Convert blob to array buffer for processing
    const arrayBuffer = await blob.arrayBuffer();
    
    // Run transcription with word-level timestamps
    const result = await transcriber(arrayBuffer, {
      return_timestamps: 'word',
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    // Extract text and word-level timestamps
    const text = result.text || '';
    const words: TranscriptionWord[] = [];

    if (result.chunks && Array.isArray(result.chunks)) {
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

    return {
      words,
      text
    };
  } catch (error) {
    console.error('Transcription error:', error);
    
    // If it's already our custom error message, re-throw it
    if (error instanceof Error && error.message.includes('Model loading failed')) {
      throw error;
    }
    
    // For other errors, provide a generic message
    throw new Error('Failed to transcribe audio. Please try again.');
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