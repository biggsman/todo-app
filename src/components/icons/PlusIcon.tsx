// Design Ref: §5.3 — "add" glyph.
import { Icon } from './Icon';
import type { IconProps } from './Icon';

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}
