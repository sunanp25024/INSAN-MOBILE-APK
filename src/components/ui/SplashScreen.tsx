import { AppLogo } from '@/components/icons/AppLogo';

export function SplashScreen() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center justify-center text-center">
        {/* Animated Logo */}
        <AppLogo className="h-32 w-32 animate-pulse-subtle" />
        
        {/* App Title */}
        <h1 className="mt-6 text-2xl font-bold text-foreground">
          INSAN MOBILE
        </h1>
        
        {/* Loading Text */}
        <p className="mt-2 text-md text-muted-foreground">
          Memuat aplikasi...
        </p>
        
        {/* Animated Progress Bar */}
        <div className="mt-8 w-48 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-progress-bar"></div>
        </div>
      </div>
    </div>
  );
}
