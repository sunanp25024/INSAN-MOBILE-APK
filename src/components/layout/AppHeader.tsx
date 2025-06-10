import { AppLogo } from '@/components/icons/AppLogo';

export function AppHeader() {
  return (
    <header className="py-6 mb-8 text-center w-full">
      <div className="flex items-center justify-center space-x-3">
        <AppLogo className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
        <h1 className="text-3xl sm:text-4xl font-headline font-bold text-primary">
          Luminous Greetings
        </h1>
      </div>
      <p className="text-muted-foreground mt-2 text-md sm:text-lg">
        Craft personalized messages for any occasion.
      </p>
    </header>
  );
}
