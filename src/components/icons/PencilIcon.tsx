// Design Ref: §5.3 — "edit" glyph.
import { Icon } from './Icon';
import type { IconProps } from './Icon';

export function PencilIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15.5 4.5l4 4L8 20H4v-4L15.5 4.5z" />
      <path d="M13.5 6.5l4 4" />
    </Icon>
  );
}
