interface NeptuneLogoProps {
  showText?: boolean;
  size?: "sm" | "md" | "lg" | "hero";
  width?: number | string;
  height?: number | string;
  className?: string;
}

const sizeClass = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-16 w-16",
  hero: "h-40 w-40 sm:h-52 sm:w-52"
};

const textSizeClass = {
  sm: "text-xl",
  md: "text-[1.7rem]",
  lg: "text-3xl",
  hero: "text-5xl"
};

export function NeptuneLogo({
  showText = true,
  size = "md",
  width,
  height,
  className = ""
}: NeptuneLogoProps) {
  const hasCustomSize = width !== undefined || height !== undefined;
  const symbolClassName = hasCustomSize ? "shrink-0" : `${sizeClass[size]} shrink-0`;

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <svg
        className={symbolClassName}
        width={width}
        height={height}
        viewBox="0 0 96 96"
        role="img"
        aria-label="neptune logo"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id="neptunePlanetStroke"
            x1="27"
            y1="26"
            x2="70"
            y2="71"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#0877D8" />
            <stop offset="1" stopColor="#21C8F6" />
          </linearGradient>
          <linearGradient
            id="neptuneSpectrum"
            x1="34"
            y1="35"
            x2="62"
            y2="61"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#24D8FF" />
            <stop offset="1" stopColor="#5E6BFF" />
          </linearGradient>
          <radialGradient
            id="neptunePlanetFill"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="matrix(29 29 -29 29 38 36)"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#F2FCFF" />
            <stop offset="0.55" stopColor="#E0F6FF" />
            <stop offset="1" stopColor="#CFEFFF" />
          </radialGradient>
          <clipPath id="neptuneFrontOrbitClip">
            <rect x="0" y="48" width="96" height="48" />
          </clipPath>
        </defs>
        <g strokeLinecap="round" strokeLinejoin="round">
          <ellipse
            cx="48"
            cy="48"
            rx="37"
            ry="12.5"
            transform="rotate(-16 48 48)"
            stroke="#128FE3"
            strokeWidth="3.6"
          />
        </g>
        <circle
          cx="48"
          cy="48"
          r="23"
          fill="url(#neptunePlanetFill)"
          stroke="url(#neptunePlanetStroke)"
          strokeWidth="3.4"
        />
        <g fill="url(#neptuneSpectrum)">
          <rect x="34" y="45" width="4" height="6" rx="2" />
          <rect x="40.5" y="40" width="4" height="16" rx="2" />
          <rect x="47" y="34" width="4" height="28" rx="2" />
          <rect x="53.5" y="40" width="4" height="16" rx="2" />
          <rect x="60" y="45" width="4" height="6" rx="2" />
        </g>
        <g strokeLinecap="round" strokeLinejoin="round" clipPath="url(#neptuneFrontOrbitClip)">
          <ellipse
            cx="48"
            cy="48"
            rx="37"
            ry="12.5"
            transform="rotate(-16 48 48)"
            stroke="#128FE3"
            strokeWidth="3.6"
          />
        </g>
      </svg>
      {showText ? (
        <span className={`${textSizeClass[size]} brand-wordmark tracking-normal text-[#0B8FE8]`}>
          neptune
        </span>
      ) : null}
    </div>
  );
}
