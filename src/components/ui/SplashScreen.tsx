import { AppLogo } from '@/components/icons/AppLogo';

export function SplashScreen() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center justify-center text-center">
        {/* Logo */}
        <AppLogo className="h-32 w-32" />
        
        {/* App Title */}
        <h1 className="mt-6 text-2xl font-bold text-foreground">
          MORA Apps
        </h1>
        
        {/* Loading Text */}
        <p className="mt-2 text-md text-muted-foreground">
          Memuat aplikasi...
        </p>
        
        {/* Animated Loading Dots */}
        <div className="mt-8 flex space-x-2">
            <div className="h-3 w-3 bg-primary rounded-full animate-loading-dots" style={{ animationDelay: '-0.32s' }}></div>
            <div className="h-3 w-3 bg-primary rounded-full animate-loading-dots" style={{ animationDelay: '-0.16s' }}></div>
            <div className="h-3 w-3 bg-primary rounded-full animate-loading-dots"></div>
        </div>
      </div>
    </div>
  );
}
