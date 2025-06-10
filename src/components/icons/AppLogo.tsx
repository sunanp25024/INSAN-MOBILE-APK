export function AppLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Mitra Kurir SPX Logo"
    >
      {/* Outer box representing a package */}
      <rect x="10" y="25" width="80" height="50" rx="5" stroke="currentColor" strokeWidth="5" />
      
      {/* Lines on the package */}
      <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="3" />
      <line x1="50" y1="25" x2="50" y2="75" stroke="currentColor" strokeWidth="3" />

      {/* Stylized "S" for SPX, resembling a path or speed */}
      <path 
        d="M35 40 C45 30, 55 30, 65 40 S 75 50, 65 60 C55 70, 45 70, 35 60 S 25 50, 35 40" 
        stroke="hsl(var(--accent))" 
        strokeWidth="6" 
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Small circle elements representing speed or tracking points */}
      <circle cx="25" cy="35" r="4" fill="currentColor" />
      <circle cx="75" cy="65" r="4" fill="currentColor" />
    </svg>
  );
}
