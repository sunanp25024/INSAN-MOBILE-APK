import { AppHeader } from '@/components/layout/AppHeader';
import { GreetingGenerator } from '@/components/features/greeting/GreetingGenerator';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center min-h-screen bg-background text-foreground font-body p-4 sm:p-6 md:p-8">
      <AppHeader />
      <main className="container mx-auto flex-grow flex flex-col items-center justify-start py-8 w-full max-w-2xl px-2">
        <GreetingGenerator />
      </main>
      <footer className="py-6 text-center text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} Luminous Greetings. Spread the light!</p>
      </footer>
    </div>
  );
}
