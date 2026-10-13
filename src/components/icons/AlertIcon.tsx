// Design Ref: §5.3, §6.1 — "problem" glyph for error toasts.
import { Icon } from './Icon';
import type { IconProps } from './Icon';

export function AlertIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.75v5M12 16.25v.01" />
    </Icon>
  );
}
