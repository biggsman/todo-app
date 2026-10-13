// Design Ref: §5.3 — "undo" glyph for the Toast action.
import { Icon } from './Icon';
import type { IconProps } from './Icon';

export function UndoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 14 4.5 9.5 9 5" />
      <path d="M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-3" />
    </Icon>
  );
}
