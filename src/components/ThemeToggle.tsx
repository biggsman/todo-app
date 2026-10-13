// Design Ref: §5.1, §5.3, §5.4 — light/dark switch (FR-11). The label names the action, so
// screen readers hear what pressing the button will do.
import { useTheme } from '@/theme/useTheme';
import { MoonIcon } from './icons/MoonIcon';
import { SunIcon } from './icons/SunIcon';
import styles from './ThemeToggle.module.css';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      data-current={theme}
    >
      <MoonIcon className={`${styles.icon} ${styles.moon}`} />
      <SunIcon className={`${styles.icon} ${styles.sun}`} />
    </button>
  );
}
