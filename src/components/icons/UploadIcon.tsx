// Design Ref: §5.3 — "import" (open a file) glyph for DataMenu.
import { Icon } from './Icon';
import type { IconProps } from './Icon';

export function UploadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" />
      <path d="M5 15.5v2A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-2" />
    </Icon>
  );
}
