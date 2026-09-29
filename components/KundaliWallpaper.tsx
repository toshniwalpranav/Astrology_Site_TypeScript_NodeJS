// Decorative background: a large North Indian kundali chart inside a 12-house zodiac wheel,
// over a faint diamond lattice. Purely visual, hidden from screen readers.
export default function KundaliWallpaper() {
  const spokes = Array.from({ length: 12 }, (_, i) => i * 30);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="lattice" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M24 4 44 24 24 44 4 24Z" fill="none" stroke="#fbbf24" strokeWidth="0.8" />
            <circle cx="24" cy="24" r="1.4" fill="#fbbf24" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#lattice)" opacity="0.07" />
      </svg>

      <svg
        viewBox="0 0 800 800"
        className="absolute left-1/2 top-1/2 h-[150vmin] w-[150vmin] -translate-x-1/2 -translate-y-1/2"
        fill="none"
        stroke="#fbbf24"
        strokeWidth="1.5"
        opacity="0.22"
      >
        {/* zodiac wheel */}
        <circle cx="400" cy="400" r="385" />
        <circle cx="400" cy="400" r="325" strokeDasharray="4 8" />
        <circle cx="400" cy="400" r="250" />
        {spokes.map((deg) => (
          <g key={deg} transform={`rotate(${deg} 400 400)`}>
            <line x1="400" y1="15" x2="400" y2="75" />
            <circle cx="400" cy="45" r="9" />
          </g>
        ))}

        {/* North Indian kundali chart */}
        <rect x="150" y="150" width="500" height="500" />
        <line x1="150" y1="150" x2="650" y2="650" />
        <line x1="650" y1="150" x2="150" y2="650" />
        <polygon points="400,150 650,400 400,650 150,400" />
      </svg>
    </div>
  );
}