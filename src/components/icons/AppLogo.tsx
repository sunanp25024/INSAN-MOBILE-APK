
import Image from 'next/image';
import { cn } from '@/lib/utils';

// Dimensions can be adjusted based on the actual logo aspect ratio
// For now, using common square dimensions for a logo placeholder
const LOGO_WIDTH = 128; // Adjusted for a more typical logo display size
const LOGO_HEIGHT = 128;

export function AppLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/Logo_PIS-removebg-preview.png" // Path relative to the public folder
      alt="INSAN MOBILE Logo"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      className={cn(className)}
      // Removed unoptimized to let Next.js handle optimization if desired,
      // but for local public files, it's often served directly.
      // priority // You might consider adding priority if this logo is critical for LCP
    />
  );
}
