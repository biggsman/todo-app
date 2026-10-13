// Design Ref: §5.1, §5.3 — app title plus the action island with DataMenu and ThemeToggle.
import { DataMenu } from './DataMenu';
import { ThemeToggle } from './ThemeToggle';
import type { NoticeInput } from './useNotices';
import styles from './Header.module.css';

interface HeaderProps {
  /** Shows import/export results in the toast region. */
  onNotify: (notice: NoticeInput) => void;
}

export function Header({ onNotify }: HeaderProps) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>Todo</h1>
      <div className={styles.actions}>
        <DataMenu onNotify={onNotify} />
        <ThemeToggle />
      </div>
    </header>
  );
}
