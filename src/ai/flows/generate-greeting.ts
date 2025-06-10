// src/ai/flows/generate-greeting.ts
'use server';

/**
 * @fileOverview A personalized greeting message generator.
 *
 * - generateGreeting - A function that generates a personalized greeting message.
 * - GenerateGreetingInput - The input type for the generateGreeting function.
 * - GenerateGreetingOutput - The return type for the generateGreeting function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateGreetingInputSchema = z.object({
  occasion: z.string().describe('The occasion for the greeting (e.g., birthday, anniversary, thank you).'),
  recipient: z.string().describe('The recipient of the greeting (e.g., Mom, John, team).'),
  tone: z.string().describe('The desired tone of the greeting (e.g., formal, informal, funny).'),
});
export type GenerateGreetingInput = z.infer<typeof GenerateGreetingInputSchema>;

const GenerateGreetingOutputSchema = z.object({
  greeting: z.string().describe('The generated personalized greeting message.'),
});
export type GenerateGreetingOutput = z.infer<typeof GenerateGreetingOutputSchema>;

export async function generateGreeting(input: GenerateGreetingInput): Promise<GenerateGreetingOutput> {
  return generateGreetingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateGreetingPrompt',
  input: {schema: GenerateGreetingInputSchema},
  output: {schema: GenerateGreetingOutputSchema},
  prompt: `You are a greeting card expert. Generate a personalized greeting message based on the occasion, recipient, and tone provided.

Occasion: {{{occasion}}}
Recipient: {{{recipient}}}
Tone: {{{tone}}}

Greeting:`, // Make sure to include "Greeting:" at the end so that the output fulfills the schema
});

const generateGreetingFlow = ai.defineFlow(
  {
    name: 'generateGreetingFlow',
    inputSchema: GenerateGreetingInputSchema,
    outputSchema: GenerateGreetingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
