import { pipeline } from '@xenova/transformers';

export interface FlaggedWord {
  start: number;
  end: number;
  word: string;
  label: string;
  score: number;
  context: string;
}

let moderationPipeline: any = null;

// Toxic keyword list for fallback moderation
const TOXIC_KEYWORDS = [
  "hate", "kill", "stupid", "idiot", "dumb", "fool", "loser", "darn", "hell", 
  "crap", "shit", "fuck", "bitch", "asshole", "bastard", "damn", "jerk", "suck",
  "moron", "trash", "ugly", "disgusting", "nonsense", "retard", "scum", "creep",
  "psycho", "lunatic", "slut", "whore", "cunt", "prick", "piss", "screw", "twat",
  "dick", "cock", "jackass", "pig", "pervert"
];

// Create a set for faster lookup
const toxicKeywordSet = new Set(TOXIC_KEYWORDS.map(word => word.toLowerCase()));

// Keyword-based fallback moderation
function moderateWithKeywords(
  transcript: string,
  wordTimestamps?: { word: string; start: number; end: number }[]
): { word: string; start: number; end: number; label: string }[] {
  const words = transcript.split(/\s+/);
  const flaggedWords: { word: string; start: number; end: number; label: string }[] = [];

  words.forEach((word, index) => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    
    if (toxicKeywordSet.has(cleanWord)) {
      // Use timestamp if available, otherwise use index-based timing
      const start = wordTimestamps?.[index]?.start ?? index;
      const end = wordTimestamps?.[index]?.end ?? index + 1;
      
      flaggedWords.push({
        word: word,
        start: start,
        end: end,
        label: "warning"
      });
    }
  });

  return flaggedWords;
}

// Updated function signature to match the requirement
export async function moderateTranscript(
  transcript: string,
  wordTimestamps?: { word: string; start: number; end: number }[]
): Promise<{ word: string; start: number; end: number; label: string }[]>;

// Legacy function signature for backward compatibility
export async function moderateTranscript(
  words: { start: number; end: number; word: string; }[]
): Promise<FlaggedWord[]>;

// Implementation with overloads
export async function moderateTranscript(
  transcriptOrWords: string | { start: number; end: number; word: string; }[],
  wordTimestamps?: { word: string; start: number; end: number }[]
): Promise<FlaggedWord[] | { word: string; start: number; end: number; label: string }[]> {
  try {
    // Handle legacy call format (array of words)
    if (Array.isArray(transcriptOrWords)) {
      const words = transcriptOrWords;
      
      // Try AI moderation first
      try {
        if (!moderationPipeline) {
          moderationPipeline = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
        }

        const flaggedWords: FlaggedWord[] = [];

        // Process each word with context window (±2 words)
        for (let i = 0; i < words.length; i++) {
          const currentWord = words[i];
          
          // Create context window (±2 words)
          const contextStart = Math.max(0, i - 2);
          const contextEnd = Math.min(words.length - 1, i + 2);
          const contextWords = words.slice(contextStart, contextEnd + 1);
          const phrase = contextWords.map(w => w.word).join(' ');

          // Skip very short phrases
          if (phrase.trim().length < 3) continue;

          try {
            // Get moderation results
            const results = await moderationPipeline(phrase);
            
            // Find the highest scoring negative result (NEGATIVE indicates potential toxicity)
            let bestResult = null;
            let highestScore = 0;

            for (const result of results) {
              if (result.label.toLowerCase() === 'negative' && result.score > highestScore) {
                bestResult = result;
                highestScore = result.score;
              }
            }

            // Flag if negative score > 0.7 (higher threshold since this is sentiment, not toxicity)
            if (bestResult && bestResult.score > 0.7) {
              // Map sentiment labels to our severity system
              let mappedLabel = 'warning';
              if (bestResult.score > 0.9) {
                mappedLabel = 'toxic';
              } else if (bestResult.score > 0.8) {
                mappedLabel = 'warning';
              } else {
                mappedLabel = 'info';
              }

              flaggedWords.push({
                start: currentWord.start,
                end: currentWord.end,
                word: currentWord.word,
                label: mappedLabel,
                score: bestResult.score,
                context: phrase
              });
            }
          } catch (error) {
            console.warn(`Failed to moderate phrase: "${phrase}"`, error);
            // Continue processing other words even if one fails
          }
        }

        return flaggedWords;
      } catch (aiError) {
        console.error('AI moderation failed, falling back to keyword-based moderation:', aiError);
        
        // Fallback to keyword-based moderation
        const transcript = words.map(w => w.word).join(' ');
        const keywordFlags = moderateWithKeywords(transcript, words);
        
        // Convert to FlaggedWord format for backward compatibility
        return keywordFlags.map(flag => ({
          start: flag.start,
          end: flag.end,
          word: flag.word,
          label: flag.label,
          score: 0.8, // Fixed confidence for keyword matches
          context: transcript
        }));
      }
    }

    // Handle new call format (transcript string)
    const transcript = transcriptOrWords as string;
    
    // Try AI moderation first
    try {
      if (!moderationPipeline) {
        moderationPipeline = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
      }

      // For transcript-based moderation, we need to create word objects
      const words = transcript.split(/\s+/);
      const wordObjects = words.map((word, index) => {
        const timestamp = wordTimestamps?.[index];
        return {
          start: timestamp?.start ?? index,
          end: timestamp?.end ?? index + 1,
          word: word.trim()
        };
      });

      // Use the existing AI moderation logic
      const flaggedWords: { word: string; start: number; end: number; label: string }[] = [];

      for (let i = 0; i < wordObjects.length; i++) {
        const currentWord = wordObjects[i];
        
        // Create context window (±2 words)
        const contextStart = Math.max(0, i - 2);
        const contextEnd = Math.min(wordObjects.length - 1, i + 2);
        const contextWords = wordObjects.slice(contextStart, contextEnd + 1);
        const phrase = contextWords.map(w => w.word).join(' ');

        // Skip very short phrases
        if (phrase.trim().length < 3) continue;

        try {
          // Get moderation results
          const results = await moderationPipeline(phrase);
          
          // Find the highest scoring negative result (NEGATIVE indicates potential toxicity)
          let bestResult = null;
          let highestScore = 0;

          for (const result of results) {
            if (result.label.toLowerCase() === 'negative' && result.score > highestScore) {
              bestResult = result;
              highestScore = result.score;
            }
          }

          // Flag if negative score > 0.7 (higher threshold since this is sentiment, not toxicity)
          if (bestResult && bestResult.score > 0.7) {
            // Map sentiment labels to our severity system
            let mappedLabel = 'warning';
            if (bestResult.score > 0.9) {
              mappedLabel = 'toxic';
            } else if (bestResult.score > 0.8) {
              mappedLabel = 'warning';
            } else {
              mappedLabel = 'info';
            }

            flaggedWords.push({
              start: currentWord.start,
              end: currentWord.end,
              word: currentWord.word,
              label: mappedLabel
            });
          }
        } catch (error) {
          console.warn(`Failed to moderate phrase: "${phrase}"`, error);
          // Continue processing other words even if one fails
        }
      }

      return flaggedWords;
    } catch (aiError) {
      console.error('AI moderation failed, falling back to keyword-based moderation:', aiError);
      
      // Fallback to keyword-based moderation
      return moderateWithKeywords(transcript, wordTimestamps);
    }
  } catch (error) {
    console.error('Moderation error:', error);
    
    // Final fallback - return keyword-based results
    if (typeof transcriptOrWords === 'string') {
      return moderateWithKeywords(transcriptOrWords, wordTimestamps);
    } else {
      const transcript = transcriptOrWords.map(w => w.word).join(' ');
      const keywordFlags = moderateWithKeywords(transcript, transcriptOrWords);
      
      // Convert to FlaggedWord format for backward compatibility
      return keywordFlags.map(flag => ({
        start: flag.start,
        end: flag.end,
        word: flag.word,
        label: flag.label,
        score: 0.8, // Fixed confidence for keyword matches
        context: transcript
      }));
    }
  }
}