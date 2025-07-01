import { AppLogo } from '@/components/icons/AppLogo';

export function SplashScreen() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center justify-center">
        <AppLogo className="h-32 w-32 animate-splash-logo" />
        <p className="mt-4 animate-splash-text text-lg text-muted-foreground opacity-0">
          Memuat aplikasi...
        </p>
      </div>
    </div>
  );
}
