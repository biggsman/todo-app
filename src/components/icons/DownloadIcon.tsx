// Design Ref: §5.3 — "export" (save a file) glyph for DataMenu.
import { Icon } from './Icon';
import type { IconProps } from './Icon';

export function DownloadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
      <path d="M5 15.5v2A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-2" />
    </Icon>
  );
}
