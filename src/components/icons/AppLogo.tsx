export function AppLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Luminous Greetings Logo"
    >
      <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="4" />
      <path
        d="M50 15C69.33 15 85 30.67 85 50C85 69.33 69.33 85 50 85C30.67 85 15 69.33 15 50C15 42.0623 18.2911 34.8237 23.8341 29.5085"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="50" cy="50" r="12" fill="currentColor" />
      {/* Subtle Rays for luminous effect */}
      <line x1="50" y1="8" x2="50" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="82" x2="50" y2="92" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="8" y1="50" x2="18" y2="50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="82" y1="50" x2="92" y2="50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      
      <line x1="21.78" y1="21.78" x2="28.85" y2="28.85" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="71.15" y1="71.15" x2="78.22" y2="78.22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="21.78" y1="78.22" x2="28.85" y2="71.15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="71.15" y1="28.85" x2="78.22" y2="21.78" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
