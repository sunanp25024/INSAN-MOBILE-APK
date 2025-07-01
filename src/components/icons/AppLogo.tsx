
import Image from 'next/image';
import { cn } from '@/lib/utils';

// Dimensions can be adjusted based on the actual logo aspect ratio
// For now, using common square dimensions for a logo placeholder
const LOGO_WIDTH = 128; // Adjusted for a more typical logo display size
const LOGO_HEIGHT = 128;

export function AppLogo({ className }: { className?: string }) {
  return (
    <Image
      // CARA MENGGANTI LOGO:
      // 1. Upload file logo Anda (misalnya, "logo-baru.png") ke dalam folder "public".
      // 2. Ganti nilai `src` di bawah ini menjadi "/logo-baru.png".
      src="/Logo_PIS-removebg-preview.png" // Path ini relatif ke folder "public".
      alt="INSAN MOBILE Logo"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      className={cn(className)}
      priority
    />
  );
}
