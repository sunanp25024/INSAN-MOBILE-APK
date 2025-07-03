
import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Renders the application logo.
 * The parent component is responsible for setting the size via className.
 * e.g., <AppLogo className="h-10 w-10" />
 */
export function AppLogo({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <Image
        src="/icons/icon-512x512.png" // This path is relative to the "public" folder.
        alt="INSAN MOBILE Logo"
        fill
        className="object-contain" // Maintains aspect ratio
        priority
      />
    </div>
  );
}
