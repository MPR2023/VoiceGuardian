// import { pipeline } from '@xenova/transformers';

export interface FlaggedWord {
  start: number;
  end: number;
  word: string;
  label: string;
  score: number;
  context: string;
}

// let moderationPipeline: any = null;

// Expanded toxic keyword list for keyword-based moderation
const TOXIC_KEYWORDS = [
  // Profanity
  "hate", "kill", "stupid", "idiot", "dumb", "fool", "loser", "darn", "hell", 
  "crap", "shit", "fuck", "bitch", "asshole", "bastard", "damn", "jerk", "suck",
  "moron", "trash", "ugly", "disgusting", "nonsense", "retard", "scum", "creep",
  "psycho", "lunatic", "slut", "whore", "cunt", "prick", "piss", "screw", "twat",
  "dick", "cock", "jackass", "pig", "pervert",
  
  // Hate speech
  "racist", "bigot", "nazi", "fascist", "terrorist", "extremist",
  
  // Threats and violence
  "murder", "violence", "attack", "destroy", "harm", "hurt", "punch", "beat",
  
  // Discriminatory language
  "faggot", "dyke", "tranny", "chink", "spic", "wetback", "nigger", "kike",
  
  // Additional inappropriate terms
  "porn", "sex", "nude", "naked", "masturbate", "orgasm", "penis", "vagina",
  "breast", "boob", "ass", "butt", "horny", "sexy", "slut", "whore"
];

// Create a set for faster lookup
const toxicKeywordSet = new Set(TOXIC_KEYWORDS.map(word => word.toLowerCase()));

// Severity mapping for different types of keywords
const getSeverityForKeyword = (word: string): string => {
  const lowerWord = word.toLowerCase();
  
  // High severity (toxic/hate speech)
  const highSeverityWords = [
    "kill", "murder", "hate", "nazi", "fascist", "terrorist", "faggot", "dyke", 
    "tranny", "chink", "spic", "wetback", "nigger", "kike", "fuck", "cunt"
  ];
  
  // Medium severity (profanity/inappropriate)
  const mediumSeverityWords = [
    "shit", "bitch", "asshole", "bastard", "damn", "prick", "dick", "cock",
    "slut", "whore", "porn", "sex", "masturbate"
  ];
  
  if (highSeverityWords.includes(lowerWord)) {
    return "toxic";
  } else if (mediumSeverityWords.includes(lowerWord)) {
    return "warning";
  } else {
    return "profanity";
  }
};

// Keyword-based moderation function
function moderateWithKeywords(
  transcript: string,
  wordTimestamps?: { word: string; start: number; end: number }[]
): { word: string; start: number; end: number; label: string }[] {
  console.log('🔍 Running keyword-based moderation on transcript:', transcript.substring(0, 100) + '...');
  
  const words = transcript.split(/\s+/);
  const flaggedWords: { word: string; start: number; end: number; label: string }[] = [];

  words.forEach((word, index) => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    
    if (toxicKeywordSet.has(cleanWord)) {
      // Use timestamp if available, otherwise use index-based timing
      const start = wordTimestamps?.[index]?.start ?? index;
      const end = wordTimestamps?.[index]?.end ?? index + 1;
      
      const severity = getSeverityForKeyword(cleanWord);
      
      flaggedWords.push({
        word: word,
        start: start,
        end: end,
        label: severity
      });
      
      console.log('🚩 Flagged word:', word, 'as', severity);
    }
  });

  console.log('✅ Keyword moderation complete, found', flaggedWords.length, 'flags');
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

// Implementation with overloads - KEYWORD-ONLY
export async function moderateTranscript(
  transcriptOrWords: string | { start: number; end: number; word: string; }[],
  wordTimestamps?: { word: string; start: number; end: number }[]
): Promise<FlaggedWord[] | { word: string; start: number; end: number; label: string }[]> {
  console.log('🛡️ Starting KEYWORD-ONLY moderation with:', { 
    type: typeof transcriptOrWords, 
    isArray: Array.isArray(transcriptOrWords),
    wordTimestampsLength: wordTimestamps?.length 
  });

  try {
    // Handle legacy call format (array of words)
    if (Array.isArray(transcriptOrWords)) {
      const words = transcriptOrWords;
      console.log('📝 Processing legacy format with', words.length, 'words');
      
      // Use keyword-based moderation only
      const transcript = words.map(w => w.word).join(' ');
      const keywordFlags = moderateWithKeywords(transcript, words);
      
      // Convert to FlaggedWord format for backward compatibility
      return keywordFlags.map(flag => ({
        start: flag.start,
        end: flag.end,
        word: flag.word,
        label: flag.label,
        score: 0.9, // High confidence for keyword matches
        context: transcript.substring(
          Math.max(0, transcript.indexOf(flag.word) - 30),
          Math.min(transcript.length, transcript.indexOf(flag.word) + flag.word.length + 30)
        )
      }));
    }

    // Handle new call format (transcript string)
    const transcript = transcriptOrWords as string;
    console.log('📝 Processing transcript format, length:', transcript.length);
    
    // Use keyword-based moderation only
    const keywordFlags = moderateWithKeywords(transcript, wordTimestamps);
    console.log('✅ Keyword moderation complete, found', keywordFlags.length, 'flags');
    return keywordFlags;
    
  } catch (error) {
    console.error('❌ Moderation error:', error);
    
    // Final fallback - return keyword-based results
    if (typeof transcriptOrWords === 'string') {
      const keywordFlags = moderateWithKeywords(transcriptOrWords, wordTimestamps);
      console.log('✅ Final fallback moderation complete, found', keywordFlags.length, 'flags');
      return keywordFlags;
    } else {
      const transcript = transcriptOrWords.map(w => w.word).join(' ');
      const keywordFlags = moderateWithKeywords(transcript, transcriptOrWords);
      
      // Convert to FlaggedWord format for backward compatibility
      return keywordFlags.map(flag => ({
        start: flag.start,
        end: flag.end,
        word: flag.word,
        label: flag.label,
        score: 0.9, // High confidence for keyword matches
        context: transcript.substring(
          Math.max(0, transcript.indexOf(flag.word) - 30),
          Math.min(transcript.length, transcript.indexOf(flag.word) + flag.word.length + 30)
        )
      }));
    }
  }
}