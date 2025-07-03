
import Image from 'next/image';
import { cn } from '@/lib/utils';

// Dimensions can be adjusted based on the actual logo aspect ratio
// For now, using common square dimensions for a logo placeholder
const LOGO_WIDTH = 128; // Adjusted for a more typical logo display size
const LOGO_HEIGHT = 128;

export function AppLogo({ className }: { className?: string }) {
  return (
    <Image
      // Logo ini sekarang menunjuk ke ikon yang ada di folder /public/icons/
      // Untuk mengubahnya, ganti file /public/icons/icon-512x512.png dengan logo Anda.
      src="/icons/icon-512x512.png" // Path ini relatif ke folder "public".
      alt="INSAN MOBILE Logo"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      className={cn(className)}
      priority
    />
  );
}
