/**
 * RunwayLogo — animated SVG logo: plane continuously takes off from runway.
 * Uses pure CSS @keyframes so no GIF is needed — works inline anywhere.
 *
 * Props:
 *  size       — pixel size of the square (default 40)
 *  className  — additional Tailwind / CSS classes for the wrapper div
 *  showText   — if true, renders "RunwayCRM" wordmark beside the icon
 */

interface RunwayLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

export default function RunwayLogo({
  size = 40,
  className = '',
  showText = false,
  textClassName = 'text-white font-bold text-xl tracking-tight',
}: RunwayLogoProps) {
  const id = `runway-${size}`; // stable enough for single-page usage

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Icon container */}
      <div
        style={{ width: size, height: size, flexShrink: 0 }}
        className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg shadow-orange-500/40 overflow-hidden flex items-center justify-center"
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '78%', height: '78%' }}
          aria-label="RunwayCRM logo"
        >
          <style>{`
            @keyframes ${id}-takeoff {
              0%   { transform: translate(0px, 0px) rotate(0deg); opacity: 1; }
              60%  { transform: translate(7px, -10px) rotate(-22deg); opacity: 1; }
              80%  { transform: translate(10px, -15px) rotate(-28deg); opacity: 0; }
              81%  { transform: translate(0px, 0px) rotate(0deg); opacity: 0; }
              100% { transform: translate(0px, 0px) rotate(0deg); opacity: 1; }
            }
            @keyframes ${id}-flash {
              0%, 50%, 100% { opacity: 0.5; }
              25%, 75%      { opacity: 1; }
            }
            .${id}-plane {
              transform-box: fill-box;
              transform-origin: center bottom;
              animation: ${id}-takeoff 2.4s ease-in-out infinite;
            }
            .${id}-light {
              animation: ${id}-flash 2.4s ease-in-out infinite;
            }
          `}</style>

          {/* Runway — two perspective lines converging to horizon */}
          <line x1="4"  y1="29" x2="16" y2="18" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.55"/>
          <line x1="28" y1="29" x2="16" y2="18" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.55"/>

          {/* Runway centre dashes */}
          <line x1="16" y1="28" x2="16" y2="25" stroke="white" strokeWidth="1" strokeDasharray="2 2" strokeLinecap="round" opacity="0.35"/>
          <line x1="16" y1="23" x2="16" y2="20" stroke="white" strokeWidth="1" strokeDasharray="2 2" strokeLinecap="round" opacity="0.35"/>

          {/* Runway threshold lights */}
          <circle cx="7"  cy="29" r="1" fill="white" className={`${id}-light`}/>
          <circle cx="25" cy="29" r="1" fill="white" className={`${id}-light`}/>

          {/* Plane body + wings — animated takeoff group */}
          <g className={`${id}-plane`}>
            {/* Fuselage */}
            <path
              d="M14.5 22 L17.5 12 L18.5 13 L16 22 Z"
              fill="white"
            />
            {/* Left wing */}
            <path
              d="M14.5 18 L8 21 L13 19.5 Z"
              fill="white"
              opacity="0.85"
            />
            {/* Right wing */}
            <path
              d="M17.5 18 L22 16 L18 19.5 Z"
              fill="white"
              opacity="0.85"
            />
            {/* Tail fin */}
            <path
              d="M15.2 21 L13.5 24 L16.5 22 Z"
              fill="white"
              opacity="0.7"
            />
          </g>
        </svg>
      </div>

      {/* Optional wordmark */}
      {showText && (
        <span className={textClassName}>RunwayCRM</span>
      )}
    </div>
  );
}
