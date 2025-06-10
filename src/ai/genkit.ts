// This file can be kept for potential future AI features,
// but is not used by the current Mitra Kurir SPX app.
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});
