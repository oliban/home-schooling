'use client';

interface WavyDividerProps {
  color?: string;
  height?: number;
  className?: string;
  flip?: boolean;
}

export function WavyDivider({
  color = '#ffffff',
  height = 40,
  className = '',
  flip = false,
}: WavyDividerProps) {
  return (
    <svg
      viewBox="0 0 1200 40"
      preserveAspectRatio="none"
      className={`w-full ${flip ? 'rotate-180' : ''} ${className}`}
      style={{ height: `${height}px` }}
    >
      <path
        fill={color}
        d="M0,40 L0,20 Q150,0 300,20 T600,20 T900,20 T1200,20 L1200,40 Z"
      />
    </svg>
  );
}
