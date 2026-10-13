// Design Ref: §5.3 — "light theme" glyph for ThemeToggle.
import { Icon } from './Icon';
import type { IconProps } from './Icon';

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="3.75" />
      <path d="M12 3v1.75M12 19.25V21M3 12h1.75M19.25 12H21M5.64 5.64l1.24 1.24M17.12 17.12l1.24 1.24M5.64 18.36l1.24-1.24M17.12 6.88l1.24-1.24" />
    </Icon>
  );
}
