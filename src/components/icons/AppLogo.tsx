
import Image from 'next/image';
import { cn } from '@/lib/utils';

const LOGO_WIDTH = 512;
const LOGO_HEIGHT = 512;

export function AppLogo({ className }: { className?: string }) {
  return (
    <Image
      src="https://placehold.co/512x512.png" // Menggunakan placeholder
      alt="Mitra Kurir SPX Logo Placeholder"
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      className={cn(className)}
      data-ai-hint="company logo" // Petunjuk untuk AI image-gen nanti
    />
  );
}
