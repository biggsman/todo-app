// Design Ref: §5.4 — priority, due, category and tag badges under a todo title.
// Each badge carries a visually hidden prefix ("우선순위", "마감" …) so screen readers get context.
import { diffInDays, formatShortDate, getDueStatus } from '@/domain/date';
import { CalendarIcon } from './icons/CalendarIcon';
import { PRIORITY_LABELS } from './todoDetails';
import type { Todo } from '@/domain/todo';
import styles from './TodoBadges.module.css';

type DueTone = 'overdue' | 'today' | 'upcoming' | 'muted';

interface DueBadge {
  tone: DueTone;
  text: string;
}

interface TodoBadgesProps {
  todo: Todo;
  /** Local 'YYYY-MM-DD', computed once per list render. */
  today: string;
}

export function TodoBadges({ todo, today }: TodoBadgesProps) {
  const due = describeDue(todo, today);

  return (
    <div className={styles.badges}>
      <span className={`${styles.badge} ${styles.priority}`} data-priority={todo.priority}>
        <span className={styles.dot} aria-hidden="true" />
        <span className="visually-hidden">우선순위 </span>
        {PRIORITY_LABELS[todo.priority]}
      </span>
      {due && (
        <span className={`${styles.badge} ${styles.due}`} data-tone={due.tone}>
          <CalendarIcon className={styles.icon} />
          <span className="visually-hidden">마감 </span>
          {due.text}
        </span>
      )}
      {todo.category && (
        <span className={`${styles.badge} ${styles.category}`}>
          <span className="visually-hidden">카테고리 </span>
          {todo.category}
        </span>
      )}
      {todo.tags.map((tag) => (
        <span key={tag} className={`${styles.badge} ${styles.tag}`}>
          <span className="visually-hidden">태그 </span>#{tag}
        </span>
      ))}
    </div>
  );
}

function describeDue(todo: Todo, today: string): DueBadge | null {
  if (todo.dueDate === null) return null;
  // Plan SC: FR-06 — overdue/today are highlighted; completed todos never get a warning tone
  switch (getDueStatus(todo, today)) {
    case 'overdue':
      return { tone: 'overdue', text: `${diffInDays(todo.dueDate, today)}일 지남` };
    case 'today':
      return { tone: 'today', text: '오늘' };
    case 'upcoming':
      return { tone: 'upcoming', text: formatShortDate(todo.dueDate, today) };
    case 'none':
      return { tone: 'muted', text: formatShortDate(todo.dueDate, today) };
  }
}
