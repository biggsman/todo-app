// Design Ref: §5.3 — "dark theme" glyph for ThemeToggle.
import { Icon } from './Icon';
import type { IconProps } from './Icon';

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19.5 14.2A7.75 7.75 0 0 1 9.8 4.5a7.75 7.75 0 1 0 9.7 9.7Z" />
    </Icon>
  );
}
