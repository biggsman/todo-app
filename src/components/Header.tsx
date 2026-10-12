// Design Ref: §5.1, §5.3 — app title plus the action area for DataMenu and ThemeToggle.
import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>Todo</h1>
      <div className={styles.actions}>
        {/* Slot: DataMenu and ThemeToggle are added here in module-5 (§11.2 steps 8, 10). */}
      </div>
    </header>
  );
}
