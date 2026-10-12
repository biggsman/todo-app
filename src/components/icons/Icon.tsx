// Design Ref: §5.3 — shared frame for thin-stroke inline SVG icons (no icon library).
import type { ReactNode, SVGProps } from 'react';

const ICON_SIZE = 18;
const STROKE_WIDTH = 1.5;

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'>;

interface IconFrameProps extends IconProps {
  children: ReactNode;
}

/** Decorative by default: the button or control around it carries the accessible name. */
export function Icon({ children, ...props }: IconFrameProps) {
  return (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}
