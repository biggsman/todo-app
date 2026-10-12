// Design Ref: §5.3 — "remove" (tag chip) glyph.
import { Icon } from './Icon';
import type { IconProps } from './Icon';

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 7l10 10M17 7L7 17" />
    </Icon>
  );
}
