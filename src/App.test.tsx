// Design Ref: §8.3 — L2 UI scenarios #1–6 against the whole page with in-memory storage.
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, toStoredData } from '@/storage/schema';
import { makeTodo } from '@/test/factories';
import { MemoryStorage } from '@/test/fakeStorage';
import App from './App';
import type { Todo } from '@/domain/todo';

const PLACEHOLDER = '할 일을 입력하세요';
const EMPTY_STATE = '할 일이 없습니다. 위에서 추가해 보세요';
const COMPLETED_AT = '2026-10-10T00:00:00.000Z';

function storageWith(todos: Todo[]): MemoryStorage {
  return new MemoryStorage({ [STORAGE_KEY]: JSON.stringify(toStoredData(todos)) });
}

function storedTodos(storage: Storage): Todo[] {
  return (JSON.parse(storage.getItem(STORAGE_KEY) ?? '') as { todos: Todo[] }).todos;
}

function renderApp(storage: Storage = new MemoryStorage()) {
  render(<App storage={storage} />);
  return { storage };
}

function titleInput(): HTMLInputElement {
  return screen.getByPlaceholderText(PLACEHOLDER);
}

/** Submits the form that owns `field` — what pressing Enter in a text field does (jsdom lacks implicit submission). */
function pressEnterIn(field: HTMLElement) {
  fireEvent.submit(field.closest('form')!);
}

function typeAndSubmit(title: string) {
  fireEvent.change(titleInput(), { target: { value: title } });
  pressEnterIn(titleInput());
}

function listItems(): HTMLElement[] {
  return within(screen.getByRole('list', { name: '할 일 목록' })).getAllByRole('listitem');
}

describe('App — L2 scenarios (§8.3)', () => {
  it('#1 shows the main elements and the empty state on load', () => {
    renderApp();

    expect(screen.getByRole('heading', { level: 1, name: 'Todo' })).toBeInTheDocument();
    expect(titleInput()).toHaveAttribute('maxLength', '200');
    expect(screen.getByRole('button', { name: '추가' })).toBeDisabled();
    expect(screen.getByText(EMPTY_STATE)).toBeInTheDocument();
    expect(screen.getByText('남은 일 0개')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '완료 항목 삭제' })).toBeDisabled();
    expect(screen.getByText('데이터는 이 브라우저에만 저장됩니다')).toBeInTheDocument();
  });

  it('#2 Enter adds the todo, clears the input and saves to storage', () => {
    const { storage } = renderApp();

    typeAndSubmit('  보고서 제출  ');

    expect(listItems()).toHaveLength(1);
    expect(screen.getByRole('checkbox', { name: '보고서 제출' })).not.toBeChecked();
    expect(titleInput()).toHaveValue('');
    expect(screen.queryByText(EMPTY_STATE)).not.toBeInTheDocument();
    expect(screen.getByText('남은 일 1개')).toBeInTheDocument();
    expect(storedTodos(storage).map((todo) => todo.title)).toEqual(['보고서 제출']);
  });

  it('#2 lists the newest todo first', () => {
    renderApp();

    typeAndSubmit('첫 번째');
    typeAndSubmit('두 번째');

    expect(listItems().map((item) => item.textContent)).toEqual(['두 번째', '첫 번째']);
  });

  it('#3 whitespace-only keeps 추가 disabled and the list unchanged', () => {
    renderApp();

    fireEvent.change(titleInput(), { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: '추가' })).toBeDisabled();

    pressEnterIn(titleInput());
    expect(screen.getByRole('alert')).toHaveTextContent('할 일 내용을 입력하세요');
    expect(screen.getByText(EMPTY_STATE)).toBeInTheDocument();

    fireEvent.change(titleInput(), { target: { value: '   a' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '추가' })).toBeEnabled();
  });

  it('#4 checking a todo marks it completed and decreases 남은 일', () => {
    const storage = storageWith([makeTodo({ title: '장보기' }), makeTodo({ title: '운동' })]);
    renderApp(storage);
    expect(screen.getByText('남은 일 2개')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: '장보기' }));

    expect(screen.getByRole('checkbox', { name: '장보기' })).toBeChecked();
    expect(screen.getByText('남은 일 1개')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '완료 항목 삭제' })).toBeEnabled();
    expect(storedTodos(storage).find((todo) => todo.title === '장보기')?.completed).toBe(true);
  });

  it('#5 Esc cancels an edit, keeps the old title and restores focus', () => {
    renderApp(storageWith([makeTodo({ title: '회의 준비' })]));

    fireEvent.click(screen.getByRole('button', { name: '회의 준비' }));
    const editor = screen.getByRole('textbox', { name: '할 일 제목 수정' });
    expect(editor).toHaveFocus();
    fireEvent.change(editor, { target: { value: '바뀐 제목' } });
    fireEvent.keyDown(editor, { key: 'Escape' });

    expect(screen.queryByRole('textbox', { name: '할 일 제목 수정' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '회의 준비' })).toHaveFocus();
    expect(screen.queryByText('바뀐 제목')).not.toBeInTheDocument();
  });

  it('#5 Enter saves an edit started from the 수정 button', () => {
    const storage = storageWith([makeTodo({ title: '회의 준비' })]);
    renderApp(storage);

    fireEvent.click(screen.getByRole('button', { name: '수정' }));
    const editor = screen.getByRole('textbox', { name: '할 일 제목 수정' });
    fireEvent.change(editor, { target: { value: '회의 자료 준비' } });
    pressEnterIn(editor);

    expect(screen.getByRole('button', { name: '회의 자료 준비' })).toHaveFocus();
    expect(storedTodos(storage)[0].title).toBe('회의 자료 준비');
  });

  it('#5 an empty edit is rejected with an inline message', () => {
    renderApp(storageWith([makeTodo({ title: '회의 준비' })]));

    fireEvent.click(screen.getByRole('button', { name: '회의 준비' }));
    const editor = screen.getByRole('textbox', { name: '할 일 제목 수정' });
    fireEvent.change(editor, { target: { value: '  ' } });
    pressEnterIn(editor);

    expect(screen.getByRole('alert')).toHaveTextContent('할 일 내용을 입력하세요');
    expect(editor).toHaveAttribute('aria-invalid', 'true');

    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(screen.getByRole('button', { name: '회의 준비' })).toBeInTheDocument();
  });

  it('#6 삭제 removes the todo from the list and storage', () => {
    const storage = storageWith([makeTodo({ title: '청소' }), makeTodo({ title: '책 읽기' })]);
    renderApp(storage);

    const row = screen.getByRole('checkbox', { name: '청소' }).closest('li')!;
    fireEvent.click(within(row).getByRole('button', { name: '삭제' }));

    expect(screen.queryByRole('checkbox', { name: '청소' })).not.toBeInTheDocument();
    expect(listItems()).toHaveLength(1);
    expect(storedTodos(storage).map((todo) => todo.title)).toEqual(['책 읽기']);
  });

  it('완료 항목 삭제 removes only completed todos', () => {
    renderApp(
      storageWith([
        makeTodo({ title: '운동', completed: true, completedAt: COMPLETED_AT }),
        makeTodo({ title: '장보기' }),
      ]),
    );

    fireEvent.click(screen.getByRole('button', { name: '완료 항목 삭제' }));

    expect(listItems().map((item) => item.textContent)).toEqual(['장보기']);
    expect(screen.getByRole('button', { name: '완료 항목 삭제' })).toBeDisabled();
  });
});
