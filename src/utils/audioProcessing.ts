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
  const categories: ('Profanity' | 'Compliance' | 'Quality')[] = ['Profanity', 'Compliance', 'Quality'];
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

  const snippets = [
    "I understand your frustration, but I need to follow our company policy regarding refunds and exchanges.",
    "Thank you for calling customer service today. How can I assist you with your account or billing questions?",
    "I'm sorry to hear about the issue with your order. Let me check the status and see what options we have.",
    "Our system shows that your payment was processed successfully. Would you like me to send you a confirmation email?",
    "I can definitely help you with that request. Let me pull up your account information and review the details.",
    "Based on our conversation today, I'll be escalating this to our technical support team for further assistance.",
    "I want to make sure we resolve this issue completely. Is there anything else I can help you with today?",
    "Your feedback is important to us. I'll make sure to document this for our quality assurance team."
  ];

  const speakers = [
    "Agent: Sarah M.",
    "Agent: John D.",
    "Agent: Maria L.",
    "Customer",
    "Agent: David R.",
    "Agent: Lisa K."
  ];

  const policyLinks = [
    "https://company.com/policies/refund-policy",
    "https://company.com/policies/data-privacy",
    "https://company.com/policies/customer-service",
    "https://company.com/policies/compliance"
  ];
  
  const numFlags = Math.floor(Math.random() * 8) + 3;
  
  for (let i = 0; i < numFlags; i++) {
    const timestamp = Math.random() * duration;
    const category = categories[Math.floor(Math.random() * categories.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const snippet = snippets[Math.floor(Math.random() * snippets.length)];
    
    // Generate flagged phrase based on category
    let flaggedPhrase = '';
    if (category === 'Profanity') {
      const profanityWords = ['damn', 'hell', 'crap', 'stupid'];
      flaggedPhrase = profanityWords[Math.floor(Math.random() * profanityWords.length)];
    } else if (category === 'Compliance') {
      const complianceWords = ['personal information', 'account details', 'policy'];
      flaggedPhrase = complianceWords[Math.floor(Math.random() * complianceWords.length)];
    } else {
      const qualityWords = ['issue', 'problem', 'frustration', 'sorry'];
      flaggedPhrase = qualityWords[Math.floor(Math.random() * qualityWords.length)];
    }

    // Generate review history for some flags
    const history = Math.random() > 0.7 ? [
      {
        reviewer: "QA Manager: Tom Wilson",
        note: "Initial review completed. Flagged for supervisor attention.",
        date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
      }
    ] : [];
    
    flags.push({
      id: `flag-${i}`,
      timestamp,
      label: labels[Math.floor(Math.random() * labels.length)],
      severity,
      description: 'Automated analysis detected potential issue requiring review.',
      confidence: Math.random() * 0.4 + 0.6, // 60-100% confidence
      category,
      snippet,
      flaggedPhrase,
      speaker: speakers[Math.floor(Math.random() * speakers.length)],
      policyLink: Math.random() > 0.5 ? policyLinks[Math.floor(Math.random() * policyLinks.length)] : undefined,
      history,
      startTime: timestamp,
      endTime: timestamp + (Math.random() * 10 + 5) // 5-15 second clips
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
  category?: 'Profanity' | 'Compliance' | 'Quality';
  snippet?: string;
  flaggedPhrase?: string;
  speaker?: string;
  policyLink?: string;
  history?: Array<{ reviewer: string; note: string; date: string }>;
  startTime?: number;
  endTime?: number;
}