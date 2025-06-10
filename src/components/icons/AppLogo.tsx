
import Image from 'next/image';
import type { StaticImageData } from 'next/image';
import { cn } from '@/lib/utils';

// It's good practice to define the intrinsic dimensions if known,
// especially when not using layout="fill".
const LOGO_WIDTH = 512;
const LOGO_HEIGHT = 512;

export function AppLogo({ className }: { className?: string }) {
  return (
    <Image
      src="https://i.ibb.co/DRC6HhX/logo-spx.png" // Direct URL to the image
      alt="Mitra Kurir SPX Logo"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      className={cn(className)} // Apply sizing classes like h-10 w-10 directly
      priority // Marking as priority helps with LCP if the logo is above the fold
      quality={100} // Request highest quality (though unoptimized overrides this)
      unoptimized // Serve the image as-is, browser fetches directly
    />
  );
}
