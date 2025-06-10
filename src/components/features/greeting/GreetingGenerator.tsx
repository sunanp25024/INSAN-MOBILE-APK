"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Sparkles } from 'lucide-react'; 
import { generateGreetingServerAction } from './actions';
import { GreetingDisplay } from './GreetingDisplay';
import type { GenerateGreetingInput } from '@/ai/flows/generate-greeting';
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  occasion: z.string().min(3, "Occasion must be at least 3 characters.").max(100, "Occasion is too long."),
  recipient: z.string().min(2, "Recipient must be at least 2 characters.").max(50, "Recipient name is too long."),
  tone: z.string().min(1, "Please select a tone."),
});

type GreetingFormValues = z.infer<typeof formSchema>;

const TONE_OPTIONS = ['Formal', 'Informal', 'Funny', 'Heartfelt', 'Celebratory', 'Sincere', 'Professional', 'Playful'];

export function GreetingGenerator() {
  const [generatedGreeting, setGeneratedGreeting] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formInputForDisplay, setFormInputForDisplay] = useState<GenerateGreetingInput | null>(null);
  const { toast } = useToast();

  const form = useForm<GreetingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      occasion: '',
      recipient: '',
      tone: '',
    },
  });

  const onSubmit: SubmitHandler<GreetingFormValues> = async (data) => {
    setIsLoading(true);
    setGeneratedGreeting(null);
    setFormInputForDisplay(data as GenerateGreetingInput); 

    try {
      const result = await generateGreetingServerAction(data as GenerateGreetingInput);
      setGeneratedGreeting(result.greeting);
      toast({
        title: "Greeting Generated!",
        description: "Your personalized greeting is ready below.",
        className: "bg-secondary text-secondary-foreground",
      });
    } catch (error) {
      console.error("Error generating greeting:", error);
      let errorMessage = "Failed to generate greeting. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Generation Error",
        description: errorMessage,
        variant: "destructive",
      });
      setGeneratedGreeting(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-10">
      <Card className="shadow-xl border-primary/50 overflow-hidden">
        <CardHeader className="bg-primary/10 text-center pt-6 pb-4">
          <CardTitle className="text-2xl font-headline text-primary flex items-center justify-center">
            <Sparkles className="mr-2 h-6 w-6" />
            Create Your Luminous Greeting
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 sm:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="occasion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">Occasion</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Birthday, Thank You, New Job" {...field} className="focus:ring-accent focus:border-accent" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recipient"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">Recipient</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Mom, John, The Team" {...field} className="focus:ring-accent focus:border-accent" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80">Tone</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="focus:ring-accent focus:border-accent">
                          <SelectValue placeholder="Select a tone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TONE_OPTIONS.map(tone => (
                          <SelectItem key={tone} value={tone}>{tone}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 text-lg transition-all duration-300 ease-in-out transform hover:scale-105" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Greeting'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {generatedGreeting && formInputForDisplay && (
        <GreetingDisplay
          greeting={generatedGreeting}
          occasion={formInputForDisplay.occasion}
          recipient={formInputForDisplay.recipient}
          tone={formInputForDisplay.tone}
        />
      )}
    </div>
  );
}
