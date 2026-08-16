import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return { viewBox: '0 0 24 24', 'aria-hidden': true, ...props } as const;
}

export function SwapIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M4 8h13l-3-3.5M20 16H7l3 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M15 4.5 19.5 9 8 20.5H3.5V16Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.75" />
      <path d="M19.5 19.5 15 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function UndoIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M6 8H15a5 5 0 0 1 0 10H9M6 8l3.5-3.5M6 8l3.5 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FlameIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M12 3.5c1 2 .5 3-.5 4.5-1.2 1.8-2 3-2 5a4.5 4.5 0 0 0 9 0c0-2-.8-3-1.5-4 .3 1.3-.2 2-1 2.3.4-2-.3-3.8-2-4.8.3 1.5-.3 2.3-1.2 3.2-.3-2.2-.5-4-.8-6.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeartIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        d="M12 20s-7-4.4-9.5-8.8C.9 8 2 4.5 5.3 3.7c1.9-.5 3.7.3 4.9 2 .5.7 1.1 1.7 1.8 2.9.7-1.2 1.3-2.2 1.8-2.9 1.2-1.7 3-2.5 4.9-2C22 4.5 23.1 8 21.5 11.2 19 15.6 12 20 12 20Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StretchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="4" r="1.8" fill="currentColor" />
      <path
        d="M12 6.5v6M12 6.5 5 9M12 6.5l7 2.5M12 12.5 7 20M12 12.5l5 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
