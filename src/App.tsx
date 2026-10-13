// Design Ref: §5.1, §5.3 — page layout and Provider setup.
import { FilterBar } from '@/components/FilterBar';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { TodoInput } from '@/components/TodoInput';
import { Toast } from '@/components/Toast';
import { TodoList } from '@/components/TodoList';
import { useNotices } from '@/components/useNotices';
import { useStorageNotices } from '@/components/useStorageNotices';
import { useTodoView } from '@/components/useTodoView';
import { TodoProvider, useTodos } from '@/state/TodoContext';
import styles from './App.module.css';

interface AppProps {
  /** Storage for the Provider; tests pass an in-memory one. Defaults to the browser's localStorage. */
  storage?: Storage | null;
}

function App({ storage }: AppProps) {
  return (
    <TodoProvider storage={storage}>
      <TodoPage />
    </TodoProvider>
  );
}

/** Everything below the Provider; owns the (unsaved) filter/sort view and toast state. */
function TodoPage() {
  const { todos } = useTodos();
  const view = useTodoView(todos);
  const { notices, notify, dismiss } = useNotices();
  useStorageNotices(notify);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Header onNotify={notify} />
        {/* Outer shell + inner core: the card sits in a faint tray (double bezel). */}
        <div className={styles.shell}>
          <section className={styles.core} aria-label="할 일">
            <TodoInput />
            <FilterBar {...view} />
            <TodoList
              todos={view.visibleTodos}
              totalCount={todos.length}
              onResetFilters={view.resetFilters}
            />
            <Footer />
          </section>
        </div>
      </main>
      <Toast notices={notices} onDismissNotice={dismiss} />
    </div>
  );
}

export default App;
