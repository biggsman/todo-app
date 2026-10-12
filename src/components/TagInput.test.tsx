// Design Ref: §5.3, §6.1 — TagInput: Enter/comma add, Backspace removes, limits shown inline.
import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ERROR_MESSAGES } from '@/domain/errors';
import { TagInput } from './TagInput';

function Harness({ initial = [] }: { initial?: string[] }) {
  const [tags, setTags] = useState(initial);
  return (
    <>
      <label htmlFor="tags">태그</label>
      <TagInput id="tags" tags={tags} onChange={setTags} />
      <output aria-label="값">{tags.join('|')}</output>
    </>
  );
}

function input(): HTMLInputElement {
  return screen.getByRole('textbox', { name: '태그' });
}

function value(): string {
  return screen.getByRole('status', { name: '값' }).textContent ?? '';
}

function chips(): string[] {
  const list = screen.queryByRole('list', { name: '선택한 태그' });
  return list
    ? within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent ?? '')
    : [];
}

describe('TagInput', () => {
  it('adds a normalized tag on Enter and clears the draft', () => {
    render(<Harness />);

    fireEvent.change(input(), { target: { value: '  Urgent ' } });
    fireEvent.keyDown(input(), { key: 'Enter' });

    expect(value()).toBe('urgent');
    expect(chips()).toEqual(['#urgent']);
    expect(input()).toHaveValue('');
  });

  it('adds on comma, including several pasted at once, and ignores duplicates', () => {
    render(<Harness initial={['home']} />);

    fireEvent.change(input(), { target: { value: 'work, HOME,next' } });

    expect(value()).toBe('home|work');
    expect(input()).toHaveValue('next');
  });

  it('removes the last tag with Backspace on an empty draft', () => {
    render(<Harness initial={['a', 'b']} />);

    fireEvent.keyDown(input(), { key: 'Backspace' });

    expect(value()).toBe('a');
  });

  it('keeps tags when Backspace is pressed with text in the draft', () => {
    render(<Harness initial={['a']} />);

    fireEvent.change(input(), { target: { value: 'x' } });
    fireEvent.keyDown(input(), { key: 'Backspace' });

    expect(value()).toBe('a');
  });

  it('removes a specific tag with its delete button', () => {
    render(<Harness initial={['a', 'b']} />);

    fireEvent.click(screen.getByRole('button', { name: '태그 a 삭제' }));

    expect(value()).toBe('b');
  });

  it('rejects a tag longer than 20 characters inline and keeps the draft', () => {
    render(<Harness />);

    fireEvent.change(input(), { target: { value: 'a'.repeat(21) } });
    fireEvent.keyDown(input(), { key: 'Enter' });

    expect(screen.getByRole('alert')).toHaveTextContent(ERROR_MESSAGES.INVALID_TAG);
    expect(input()).toHaveAttribute('aria-invalid', 'true');
    expect(input()).toHaveValue('a'.repeat(21));
    expect(value()).toBe('');
  });

  it('rejects an 11th tag', () => {
    const ten = Array.from({ length: 10 }, (_, index) => `t${index}`);
    render(<Harness initial={ten} />);

    fireEvent.change(input(), { target: { value: 'eleven' } });
    fireEvent.keyDown(input(), { key: 'Enter' });

    expect(screen.getByRole('alert')).toHaveTextContent(ERROR_MESSAGES.INVALID_TAG);
    expect(chips()).toHaveLength(10);
  });

  it('commits the draft when the field loses focus', () => {
    render(<Harness />);

    fireEvent.change(input(), { target: { value: 'later' } });
    fireEvent.blur(input());

    expect(value()).toBe('later');
  });
});
