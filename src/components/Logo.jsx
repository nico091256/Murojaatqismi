export default function Logo({ size = 28, color = "#F7A838", className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
    >
      {/* Back Frame */}
      <path
        d="M228 58 H422 V336 H364"
        stroke={color}
        strokeWidth="38"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      
      {/* Front Frame Outer Rectangle */}
      <rect
        x="96"
        y="88"
        width="246"
        height="380"
        stroke={color}
        strokeWidth="38"
        strokeLinejoin="miter"
      />
      
      {/* Center Vertical Column */}
      <path
        d="M239 138 V332"
        stroke={color}
        strokeWidth="38"
        strokeLinecap="square"
      />
      
      {/* Isometric Diagonal Line */}
      <path
        d="M106 452 L246 322"
        stroke={color}
        strokeWidth="38"
        strokeLinecap="square"
      />
      
      {/* Bottom Inner Horizontal Line */}
      <path
        d="M239 332 H324"
        stroke={color}
        strokeWidth="38"
        strokeLinecap="square"
      />
    </svg>
  );
}
