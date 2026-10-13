// Design Ref: §5.2, §5.4 — where keyboard focus goes when the focused element disappears
// (a deleted row, a closed toast). Rows mark their focus target, so these helpers need no refs
// across components.
export const TODO_TITLE_INPUT_ID = 'todo-title-input';

/** Rows (`li[data-todo-id]`) mark their main control, the title button, with this attribute. */
const ROW_FOCUS_SELECTOR = '[data-row-focus]';

/** Focuses the main control of a todo row; false if `row` is not a (non-editing) todo row. */
export function focusTodoRow(row: Element | null | undefined): boolean {
  const target = row?.querySelector<HTMLElement>(ROW_FOCUS_SELECTOR);
  if (!target) return false;
  target.focus();
  return true;
}

/** Focuses the row of the todo with `id` if it is currently shown. */
export function focusTodoById(id: string): boolean {
  // Matching on dataset avoids building a selector from an (imported, arbitrary) id.
  const rows = document.querySelectorAll<HTMLElement>('[data-todo-id]');
  const row = Array.from(rows).find((element) => element.dataset.todoId === id);
  return focusTodoRow(row);
}

/**
 * Last-resort focus target. Only used after keyboard activation: focusing a text field after a
 * tap would pop up the on-screen keyboard on phones. Keyboard (Enter/Space) and assistive-tech
 * clicks report `detail === 0`; mouse and touch clicks count from 1.
 */
export function focusTitleInputAfterKeyboard(click: { detail: number }): void {
  if (click.detail !== 0) return;
  document.getElementById(TODO_TITLE_INPUT_ID)?.focus();
}
