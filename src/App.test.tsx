// Design Ref: §8.3 — L2 UI scenarios #1–8 against the whole page with in-memory storage.
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, toStoredData } from '@/storage/schema';
import { makeFixtureTodos, makeTodo } from '@/test/factories';
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

/** Titles in display order (each row's checkbox is named after its todo). */
function listTitles(): string[] {
  return within(screen.getByRole('list', { name: '할 일 목록' }))
    .getAllByRole('checkbox')
    .map((checkbox) => checkbox.getAttribute('aria-label') ?? '');
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

    expect(listTitles()).toEqual(['두 번째', '첫 번째']);
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

    expect(listTitles()).toEqual(['장보기']);
    expect(screen.getByRole('button', { name: '완료 항목 삭제' })).toBeDisabled();
  });
});

describe('App — details, filters and sort (§8.3 #7–8, §5.4)', () => {
  const NO_MATCH = '조건에 맞는 할 일이 없습니다';

  function searchBox(): HTMLElement {
    return screen.getByRole('searchbox', { name: '검색' });
  }

  function sortSelect(): HTMLElement {
    return screen.getByRole('combobox', { name: '정렬' });
  }

  it('#7 완료 tab plus a search term shows only matching completed todos', () => {
    renderApp(storageWith(makeFixtureTodos()));

    fireEvent.click(screen.getByRole('button', { name: '완료' }));
    expect(screen.getByRole('button', { name: '완료' })).toHaveAttribute('aria-pressed', 'true');
    expect(listTitles().sort()).toEqual(['세금 납부', '운동']);

    fireEvent.change(searchBox(), { target: { value: '운동' } });
    expect(listTitles()).toEqual(['운동']);
  });

  it('#7 no match shows the no-results state, and 필터 초기화 brings everything back', () => {
    renderApp(storageWith(makeFixtureTodos()));

    fireEvent.click(screen.getByRole('button', { name: '완료' }));
    fireEvent.change(searchBox(), { target: { value: '보고서' } });

    expect(screen.getByText(NO_MATCH)).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_STATE)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '필터 초기화' }));

    expect(listItems()).toHaveLength(8);
    expect(searchBox()).toHaveValue('');
    expect(screen.getByRole('button', { name: '전체' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('#8 sorting by 우선순위순 puts high priority first', () => {
    renderApp(storageWith(makeFixtureTodos()));

    fireEvent.change(sortSelect(), { target: { value: 'priority' } });

    const titles = listTitles();
    expect(titles.slice(0, 3).sort()).toEqual(['보고서 제출', '세금 납부', '회의 준비'].sort());
    expect(titles.slice(-2).sort()).toEqual(['책 읽기', '청소'].sort());
  });

  it('defaults to 마감일순 with undated todos last', () => {
    renderApp(storageWith(makeFixtureTodos()));

    expect(sortSelect()).toHaveValue('dueDate');
    expect(listTitles()[0]).toBe('세금 납부');
    expect(listTitles().slice(-2).sort()).toEqual(['책 읽기', '청소'].sort());
  });

  it('filters by category and tag with options taken from the data', () => {
    renderApp(storageWith(makeFixtureTodos()));
    const category = screen.getByRole('combobox', { name: '카테고리 필터' });
    const tag = screen.getByRole('combobox', { name: '태그 필터' });

    expect(
      within(category)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['전체', '개인', '업무']);

    fireEvent.change(category, { target: { value: '업무' } });
    fireEvent.change(tag, { target: { value: 'meeting' } });

    expect(listTitles().sort()).toEqual(['Email Client', '회의 준비'].sort());
  });

  it('resets a selected category to 전체 once no todo uses it', () => {
    renderApp(storageWith([makeTodo({ title: '보고서', category: '업무' }), makeTodo()]));
    const category = screen.getByRole('combobox', { name: '카테고리 필터' });
    fireEvent.change(category, { target: { value: '업무' } });
    expect(listTitles()).toEqual(['보고서']);

    fireEvent.click(screen.getByRole('button', { name: '보고서' }));
    fireEvent.change(screen.getByRole('combobox', { name: '카테고리' }), { target: { value: '' } });
    pressEnterIn(screen.getByRole('textbox', { name: '할 일 제목 수정' }));

    expect(category).toHaveValue('');
    expect(listItems()).toHaveLength(2);
  });

  it('the 필터 toggle reports its expanded state', () => {
    renderApp();
    const toggle = screen.getByRole('button', { name: '필터' });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('adds a todo with due date, priority, category and tags from 세부 옵션', () => {
    const { storage } = renderApp();
    const disclosure = screen.getByRole('button', { name: '세부 옵션' });
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(disclosure);
    expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    const priority = screen.getByRole('combobox', { name: '우선순위' });
    expect(priority).toHaveValue('medium');

    fireEvent.change(screen.getByLabelText('마감일'), { target: { value: '2026-10-20' } });
    fireEvent.change(priority, { target: { value: 'high' } });
    fireEvent.change(screen.getByRole('combobox', { name: '카테고리' }), {
      target: { value: ' 업무 ' },
    });
    const tags = screen.getByRole('textbox', { name: '태그' });
    fireEvent.change(tags, { target: { value: 'Urgent' } });
    fireEvent.keyDown(tags, { key: 'Enter' });
    typeAndSubmit('발표 준비');

    expect(storedTodos(storage)[0]).toMatchObject({
      title: '발표 준비',
      dueDate: '2026-10-20',
      priority: 'high',
      category: '업무',
      tags: ['urgent'],
    });
    // The form resets to the defaults for the next todo.
    expect(priority).toHaveValue('medium');
    expect(screen.getByRole('combobox', { name: '카테고리' })).toHaveValue('');
  });

  it('shows INVALID_CATEGORY inline next to the category field', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: '세부 옵션' }));
    const category = screen.getByRole('combobox', { name: '카테고리' });

    // maxLength only limits typing, so a programmatic value can still exceed it.
    fireEvent.change(category, { target: { value: 'x'.repeat(31) } });
    typeAndSubmit('할 일');

    expect(screen.getByRole('alert')).toHaveTextContent('카테고리는 30자 이하입니다');
    expect(category).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(EMPTY_STATE)).toBeInTheDocument();
  });

  it('the editor saves changed details', () => {
    const storage = storageWith([
      makeTodo({ title: '보고서', priority: 'high', category: '업무', tags: ['a', 'b'] }),
    ]);
    renderApp(storage);

    fireEvent.click(screen.getByRole('button', { name: '수정' }));
    const editor = screen.getByRole('textbox', { name: '할 일 제목 수정' }).closest('form')!;
    fireEvent.change(screen.getByRole('combobox', { name: '우선순위' }), {
      target: { value: 'low' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: '카테고리' }), {
      target: { value: '개인' },
    });
    fireEvent.click(screen.getByRole('button', { name: '태그 a 삭제' }));
    fireEvent.change(within(editor).getByLabelText('마감일'), { target: { value: '2026-11-01' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(storedTodos(storage)[0]).toMatchObject({
      title: '보고서',
      priority: 'low',
      category: '개인',
      tags: ['b'],
      dueDate: '2026-11-01',
    });
    expect(within(listItems()[0]).getByText('낮음')).toBeInTheDocument();
  });
});
