// ABOUTME: App logo showing a Rubik's Cube sketch with tagline.
// ABOUTME: Used in the sidebar header as the InSpire brand mark.

export function Logo() {
  return (
    <div className="flex flex-col items-start gap-0.5">
      <div className="flex items-center gap-2.5">
        <RubiksCube className="h-7 w-7 text-foreground" />
        <span className="text-lg font-semibold">InSpire</span>
      </div>
      <span className="text-[10px] text-muted-foreground leading-tight pl-[38px]">
        Simple solutions to impossible problems
      </span>
    </div>
  );
}

function RubiksCube({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Top face (parallelogram) */}
      <polygon points="50,8 82,24 50,40 18,24" />
      {/* Top face grid lines */}
      <line x1="39.3" y1="13.3" x2="39.3" y2="29.3" />
      <line x1="60.7" y1="13.3" x2="60.7" y2="29.3" />
      {/* Top face grid lines - horizontal */}
      <line x1="28.7" y1="18.7" x2="71.3" y2="18.7" />
      <line x1="28.7" y1="29.3" x2="71.3" y2="29.3" />

      {/* Left face */}
      <polygon points="18,24 50,40 50,80 18,64" />
      {/* Left face grid lines - vertical */}
      <line x1="29.3" y1="29.3" x2="29.3" y2="69.3" />
      <line x1="39.3" y1="34.7" x2="39.3" y2="74.7" />
      {/* Left face grid lines - horizontal */}
      <line x1="18" y1="37.3" x2="50" y2="53.3" />
      <line x1="18" y1="50.7" x2="50" y2="66.7" />

      {/* Right face */}
      <polygon points="50,40 82,24 82,64 50,80" />
      {/* Right face grid lines - vertical */}
      <line x1="60.7" y1="34.7" x2="60.7" y2="74.7" />
      <line x1="71.3" y1="29.3" x2="71.3" y2="69.3" />
      {/* Right face grid lines - horizontal */}
      <line x1="50" y1="53.3" x2="82" y2="37.3" />
      <line x1="50" y1="66.7" x2="82" y2="50.7" />
    </svg>
  );
}
