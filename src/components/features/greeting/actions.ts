"use server";

import { generateGreeting, type GenerateGreetingInput, type GenerateGreetingOutput } from '@/ai/flows/generate-greeting';

export async function generateGreetingServerAction(input: GenerateGreetingInput): Promise<GenerateGreetingOutput> {
  // The AI flow schema (GenerateGreetingOutputSchema) ensures 'greeting' is a string.
  // If the flow fails internally (e.g., API error from Google AI), genkit might throw an error.
  // This server action will propagate that error, or the successful result.
  try {
    const result = await generateGreeting(input);
    // Ensure the greeting is not null or undefined, though schema should prevent this.
    if (!result || typeof result.greeting !== 'string') {
        throw new Error("AI flow returned an invalid result.");
    }
    return result;
  } catch (error) {
    console.error("Error in server action 'generateGreetingServerAction':", error);
    // Propagate a generic error message or a more specific one if possible
    throw new Error(`Failed to generate greeting: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
