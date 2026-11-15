import type { ReactNode } from 'react';

export type IconName =
  | 'dial'
  | 'resibo'
  | 'trend'
  | 'plus'
  | 'minus'
  | 'swap'
  | 'shuffle'
  | 'close'
  | 'arrowRight'
  | 'arrowLeft'
  | 'check'
  | 'scale'
  | 'trash'
  | 'today'
  | 'dumbbell'
  | 'sun'
  | 'share'
  | 'moon';

const PATHS: Record<IconName, ReactNode> = {
  dial: (
    <>
      <path d="M4 16a8 8 0 0 1 16 0" />
      <path d="M12 16l4-6" />
      <path d="M3 20h18" />
    </>
  ),
  resibo: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  trend: (
    <>
      <path d="M3 17l5-5 4 3 8-9" />
      <path d="M15 6h5v5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  swap: (
    <>
      <path d="M4 8h14l-4-4" />
      <path d="M20 16H6l4 4" />
    </>
  ),
  shuffle: (
    <>
      <path d="M3 7h4l8 10h5" />
      <path d="M3 17h4l2.5-3M13 9.5 15 7h5" />
      <path d="M17 4l3 3-3 3M17 14l3 3-3 3" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  arrowRight: <path d="M4 12h15M13 6l6 6-6 6" />,
  arrowLeft: <path d="M20 12H5M11 6l-6 6 6 6" />,
  check: <path d="M4 12.5l5 5L20 6.5" />,
  scale: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 10a4 4 0 0 1 8 0" />
      <path d="M12 10l1.5-2" />
    </>
  ),
  today: (
    <>
      <rect x="4" y="5" width="16" height="15" />
      <path d="M4 10h16M8 3v4M16 3v4" />
      <path d="M11 14h2v2h-2z" />
    </>
  ),
  dumbbell: (
    <>
      <path d="M8 12h8" />
      <path d="M5 7v10M8 5v14M16 5v14M19 7v10" />
      <path d="M2 12h3M19 12h3" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </>
  ),
  share: (
    <>
      <path d="M12 14V3M8 7l4-4 4 4" />
      <path d="M6 10H5v11h14V10h-1" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" />,
  trash: (
    <>
      <path d="M5 7h14M10 7V4h4v3" />
      <path d="M7 7l1 13h8l1-13" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  size?: number;
}

/** Line icons drawn for this app. Decorative by default, so pair with visible or hidden text. */
export function Icon({ name, size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
