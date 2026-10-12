// Design Ref: §5.3 — check mark drawn over the styled completion checkbox.
import { Icon } from './Icon';
import type { IconProps } from './Icon';

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5.5 12.5l4 4 9-9" />
    </Icon>
  );
}
