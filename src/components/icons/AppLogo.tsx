import Image from 'next/image';
import { cn } from '@/lib/utils';

export function AppLogo({ className }: { className?: string }) {
  // The className (e.g., h-10 w-10) will be applied to this wrapper div.
  // next/image with layout="fill" and objectFit="contain" will adapt to this size.
  return (
    <div className={cn("relative", className)}>
      <Image
        src="https://i.ibb.co/DRC6HhX/logo-spx.png" // Direct URL to the image
        alt="Mitra Kurir SPX Logo"
        layout="fill"
        objectFit="contain"
        priority // Marking as priority helps with LCP if the logo is above the fold
      />
    </div>
  );
}
