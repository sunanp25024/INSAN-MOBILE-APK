"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from 'react';

interface GreetingDisplayProps {
  greeting: string;
  occasion: string;
  recipient: string;
  tone: string;
}

export function GreetingDisplay({ greeting, occasion, recipient, tone }: GreetingDisplayProps) {
  const { toast } = useToast();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Timeout to ensure the element is in the DOM before animating
    const timer = setTimeout(() => {
        setIsVisible(true);
    }, 100); // Small delay
    return () => clearTimeout(timer);
  }, []);

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(greeting)
      .then(() => {
        toast({
          title: "Copied to clipboard!",
          description: "Greeting copied successfully.",
        });
      })
      .catch(err => {
        console.error("Failed to copy: ", err);
        toast({
          title: "Error copying",
          description: "Could not copy greeting to clipboard.",
          variant: "destructive",
        });
      });
  };

  return (
    <div
      className={`w-full transition-all ease-in-out duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <Card className="shadow-xl bg-card border-accent/50 overflow-hidden">
        <CardHeader className="text-center bg-accent/10 pt-6 pb-4">
          <CardTitle className="text-3xl font-headline text-accent">Your Luminous Greeting</CardTitle>
          <CardDescription className="text-muted-foreground italic">
            For {recipient}, celebrating {occasion.toLowerCase()}, in a {tone.toLowerCase()} tone.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-lg text-foreground text-center leading-relaxed whitespace-pre-wrap p-6 bg-background/70 rounded-lg shadow-inner min-h-[100px]">
            {greeting}
          </p>
        </CardContent>
        <CardFooter className="flex justify-center pb-6">
          <Button 
            onClick={handleCopyToClipboard} 
            variant="outline" 
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors duration-300"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy Greeting
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
