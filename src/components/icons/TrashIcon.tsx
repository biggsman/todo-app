// Design Ref: §5.3 — "delete" glyph.
import { Icon } from './Icon';
import type { IconProps } from './Icon';

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 7h15M10 4h4M6.5 7l.9 11.2A2 2 0 0 0 9.4 20h5.2a2 2 0 0 0 2-1.8L17.5 7" />
      <path d="M10.25 11v5M13.75 11v5" />
    </Icon>
  );
}
