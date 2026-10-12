// Design Ref: §5.3 — "expand" (disclosure and select) glyph.
import { Icon } from './Icon';
import type { IconProps } from './Icon';

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 9.5l6 6 6-6" />
    </Icon>
  );
}
