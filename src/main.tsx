import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// import { env } from '@xenova/transformers';
import App from './App.tsx';
import './index.css';

// COMMENTED OUT: Transformers configuration for browser-based models
// Configure transformers to always use remote models from Hugging Face CDN
// env.remoteModelPath = 'https://huggingface.co/';
// env.allowLocalModels = false;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);