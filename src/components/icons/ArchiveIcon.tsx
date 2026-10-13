// Design Ref: §5.1, §5.3 — "data" (backup menu) glyph for DataMenu.
import { Icon } from './Icon';
import type { IconProps } from './Icon';

export function ArchiveIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <ellipse cx="12" cy="6" rx="7" ry="2.5" />
      <path d="M5 6v6c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5V6" />
      <path d="M5 12v6c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5v-6" />
    </Icon>
  );
}
