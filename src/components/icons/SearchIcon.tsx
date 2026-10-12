// Design Ref: §5.3 — "search" glyph.
import { Icon } from './Icon';
import type { IconProps } from './Icon';

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.4-4.4" />
    </Icon>
  );
}
