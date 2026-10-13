// Design Ref: §8.4 — L3 E2E scenarios #1–7 in a real browser against the production build.
// Every test gets a fresh browser context, so localStorage starts empty each time.
import { readFile, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const PLACEHOLDER = '할 일을 입력하세요';

interface NewTodo {
  title: string;
  dueDate?: string;
  priority?: 'high' | 'medium' | 'low';
  tags?: string[];
}

function todoList(page: Page): Locator {
  return page.getByRole('list', { name: '할 일 목록' });
}

function row(page: Page, title: string): Locator {
  return todoList(page)
    .getByRole('listitem')
    .filter({ has: page.getByRole('checkbox', { name: title }) });
}

async function addTodo(page: Page, todo: NewTodo) {
  const hasDetails = todo.dueDate || todo.priority || todo.tags;
  if (hasDetails) {
    const disclosure = page.getByRole('button', { name: /세부 옵션/ });
    if ((await disclosure.getAttribute('aria-expanded')) === 'false') await disclosure.click();
    const form = page.locator('form').first();
    if (todo.dueDate) await form.getByLabel('마감일').fill(todo.dueDate);
    if (todo.priority)
      await form.getByRole('combobox', { name: '우선순위' }).selectOption(todo.priority);
    for (const tag of todo.tags ?? []) {
      await form.getByRole('textbox', { name: '태그' }).fill(tag);
      await form.getByRole('textbox', { name: '태그' }).press('Enter');
    }
  }
  await page.getByPlaceholder(PLACEHOLDER).fill(todo.title);
  await page.getByPlaceholder(PLACEHOLDER).press('Enter');
  await expect(page.getByRole('checkbox', { name: todo.title })).toBeVisible();
}

async function checkboxTitles(page: Page): Promise<string[]> {
  return todoList(page)
    .getByRole('checkbox')
    .evaluateAll((boxes) => boxes.map((box) => box.getAttribute('aria-label') ?? ''));
}

/** Presses Tab until `target` has focus (keyboard-only navigation, at most `limit` presses). */
async function tabTo(page: Page, target: Locator, limit = 40) {
  for (let presses = 0; presses < limit; presses += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}

test.describe('§8.4 E2E', () => {
  test('#1 todos and their details persist across a reload', async ({ page }) => {
    await page.goto('/');
    await addTodo(page, {
      title: '보고서 제출',
      dueDate: '2030-01-15',
      priority: 'high',
      tags: ['work'],
    });
    await addTodo(page, { title: '장보기', priority: 'low', tags: ['home', 'weekly'] });
    await addTodo(page, { title: '운동' });
    await page.getByRole('checkbox', { name: '운동' }).check();

    await page.reload();

    expect((await checkboxTitles(page)).sort()).toEqual(['보고서 제출', '운동', '장보기'].sort());
    await expect(page.getByRole('checkbox', { name: '운동' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: '장보기' })).not.toBeChecked();
    const report = row(page, '보고서 제출');
    await expect(report.getByText('높음')).toBeVisible();
    await expect(report.getByText('#work')).toBeVisible();
    await expect(report.getByText('2030/1/15')).toBeVisible();
    await expect(row(page, '장보기').getByText('낮음')).toBeVisible();
    await expect(row(page, '장보기').getByText('#weekly')).toBeVisible();
    await expect(page.getByText('남은 일 2개')).toBeVisible();
  });

  test('#2 export → delete everything → import restores the list', async ({ page }, testInfo) => {
    await page.goto('/');
    await addTodo(page, { title: '첫 번째', priority: 'high' });
    await addTodo(page, { title: '두 번째', tags: ['backup'] });
    await addTodo(page, { title: '세 번째' });
    await page.getByRole('checkbox', { name: '세 번째' }).check();
    const original = await checkboxTitles(page);

    await page.getByRole('button', { name: '데이터' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: '내보내기' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^todo-app-backup-\d{4}-\d{2}-\d{2}\.json$/);
    const backupPath = testInfo.outputPath(download.suggestedFilename());
    await download.saveAs(backupPath);
    expect(JSON.parse(await readFile(backupPath, 'utf8'))).toMatchObject({ app: 'todo-app' });

    for (const title of original) {
      await row(page, title).getByRole('button', { name: '삭제' }).click();
    }
    await expect(page.getByText('할 일이 없습니다. 위에서 추가해 보세요')).toBeVisible();

    await page.getByRole('button', { name: '데이터' }).click();
    const chooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('menuitem', { name: '가져오기' }).click();
    await (await chooserPromise).setFiles(backupPath);

    const dialog = page.getByRole('dialog', { name: '데이터 가져오기' });
    await expect(dialog).toContainText('새 할 일 3개를 추가하고, 0개를 더 최신 내용으로 바꿉니다');
    await dialog.getByRole('button', { name: '합치기' }).click();

    await expect(page.getByText('3개 추가, 0개 갱신했습니다')).toBeVisible();
    expect(await checkboxTitles(page)).toEqual(original);
    await expect(page.getByRole('checkbox', { name: '세 번째' })).toBeChecked();
    await page.reload();
    expect(await checkboxTitles(page)).toEqual(original);
  });

  test('#3 an invalid import shows an error and keeps the data', async ({ page }, testInfo) => {
    await page.goto('/');
    await addTodo(page, { title: '지켜야 할 일' });
    const wrongPath = testInfo.outputPath('not-a-backup.json');
    await writeFile(wrongPath, JSON.stringify({ hello: 'world' }));
    const brokenPath = testInfo.outputPath('broken.json');
    await writeFile(brokenPath, '{ broken');

    for (const [path, message] of [
      [wrongPath, 'todo-app 백업 파일이 아니거나 형식이 맞지 않습니다'],
      [brokenPath, '올바른 JSON 파일이 아닙니다'],
    ]) {
      await page.getByRole('button', { name: '데이터' }).click();
      const chooserPromise = page.waitForEvent('filechooser');
      await page.getByRole('menuitem', { name: '가져오기' }).click();
      await (await chooserPromise).setFiles(path);
      await expect(page.getByText(message)).toBeVisible();
    }

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.reload();
    expect(await checkboxTitles(page)).toEqual(['지켜야 할 일']);
  });

  test.describe('#4 mobile 360×740', () => {
    test.use({ viewport: { width: 360, height: 740 }, hasTouch: true });

    test('no horizontal scroll, and add / filter / edit all work', async ({ page }) => {
      await page.goto('/');
      const noHorizontalScroll = () =>
        page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      expect(await noHorizontalScroll()).toBe(true);

      await addTodo(page, {
        title: '아주 긴 제목의 할 일이 모바일 화면에서도 잘리지 않고 줄바꿈되는지 확인합니다',
        dueDate: '2030-03-01',
        priority: 'high',
        tags: ['mobile', 'layout'],
      });
      await addTodo(page, { title: '짧은 일' });
      expect(await noHorizontalScroll()).toBe(true);

      // Filter: the selects sit behind the 필터 toggle on narrow screens.
      await page.getByRole('button', { name: '필터' }).click();
      await page.getByRole('combobox', { name: '태그 필터' }).selectOption('mobile');
      expect(await checkboxTitles(page)).toHaveLength(1);
      await page.getByRole('combobox', { name: '태그 필터' }).selectOption('');

      // Edit via the 수정 button.
      await row(page, '짧은 일').getByRole('button', { name: '수정' }).click();
      await page.getByRole('textbox', { name: '할 일 제목 수정' }).fill('고친 일');
      await page.getByRole('textbox', { name: '할 일 제목 수정' }).press('Enter');
      await expect(page.getByRole('checkbox', { name: '고친 일' })).toBeVisible();

      await page.getByRole('button', { name: '데이터' }).click();
      await expect(page.getByRole('menu')).toBeVisible();
      expect(await noHorizontalScroll()).toBe(true);
      await page.keyboard.press('Escape');

      // Every visible <button> is inside the viewport horizontally and big enough to tap. (The
      // hidden file input also has role "button"; it is opened through the 가져오기 menu item.)
      const buttons = await page.locator('button').evaluateAll((elements) =>
        elements
          .filter((element) => (element as HTMLElement).offsetParent !== null)
          .map((element) => {
            const box = element.getBoundingClientRect();
            return {
              name: element.getAttribute('aria-label') ?? element.textContent,
              left: box.left,
              right: box.right,
              height: box.height,
            };
          }),
      );
      for (const button of buttons) {
        expect(button.left, `${button.name} left`).toBeGreaterThanOrEqual(0);
        expect(button.right, `${button.name}`).toBeLessThanOrEqual(360);
        expect(button.height, `${button.name} height`).toBeGreaterThanOrEqual(32);
      }
      expect(await noHorizontalScroll()).toBe(true);
    });
  });

  test('#5 keyboard only: add, complete, edit, cancel, delete and undo', async ({ page }) => {
    await page.goto('/');
    const input = page.getByPlaceholder(PLACEHOLDER);

    await tabTo(page, input);
    await page.keyboard.type('키보드 할 일');
    await page.keyboard.press('Enter');
    await page.keyboard.type('두 번째 할 일');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('checkbox', { name: '키보드 할 일' })).toBeVisible();

    const checkbox = page.getByRole('checkbox', { name: '키보드 할 일' });
    await tabTo(page, checkbox);
    await page.keyboard.press('Space');
    await expect(checkbox).toBeChecked();

    const title = page.getByRole('button', { name: '키보드 할 일' });
    await tabTo(page, title);
    await page.keyboard.press('Enter');
    const editor = page.getByRole('textbox', { name: '할 일 제목 수정' });
    await expect(editor).toBeFocused();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('취소될 제목');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: '키보드 할 일' })).toBeFocused();

    await page.keyboard.press('Enter');
    await page.keyboard.press('Control+A');
    await page.keyboard.type('고친 할 일');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: '고친 할 일' })).toBeFocused();

    await tabTo(page, row(page, '고친 할 일').getByRole('button', { name: '삭제' }));
    await page.keyboard.press('Enter');
    await expect(page.getByRole('checkbox', { name: '고친 할 일' })).toHaveCount(0);
    // Focus lands on the remaining row rather than being lost.
    await expect(page.getByRole('button', { name: '두 번째 할 일' })).toBeFocused();

    await tabTo(page, page.getByRole('button', { name: '되돌리기' }));
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: '고친 할 일' })).toBeFocused();
  });

  test('#7 the Undo toast waits while hovered or focused (WCAG 2.2.1)', async ({ page }) => {
    // Fake clock: time only moves when the test says so.
    await page.clock.install();
    await page.goto('/');
    await addTodo(page, { title: '잠깐 보류' });
    await row(page, '잠깐 보류').getByRole('button', { name: '삭제' }).click();
    const toast = page.locator('[data-tone="undo"]');
    const undoButton = toast.getByRole('button', { name: '되돌리기' });

    await toast.hover();
    await page.clock.runFor(15_000);
    await expect(undoButton).toBeVisible();

    await page.mouse.move(0, 0);
    await undoButton.focus();
    await page.clock.runFor(15_000);
    await expect(undoButton).toBeVisible();

    // Leaving the toast (pointer already out, focus moves away) restarts a full 5s window.
    await page.getByPlaceholder(PLACEHOLDER).focus();
    await page.clock.runFor(4_500);
    await expect(undoButton).toBeVisible();
    await page.clock.runFor(1_000);
    await expect(toast).toHaveCount(0);
    expect(await checkboxTitles(page)).toEqual([]);
  });

  test.describe('#6 dark mode', () => {
    test.use({ colorScheme: 'dark' });

    test('starts dark from the system, and a manual choice survives a reload', async ({ page }) => {
      await page.goto('/');
      const html = page.locator('html');
      await expect(html).toHaveAttribute('data-theme', 'dark');
      const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(background).toBe('rgb(11, 11, 13)');

      await page.getByRole('button', { name: '라이트 모드로 전환' }).click();
      await expect(html).toHaveAttribute('data-theme', 'light');

      await page.reload();
      await expect(html).toHaveAttribute('data-theme', 'light');
      await expect(page.getByRole('button', { name: '다크 모드로 전환' })).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem('todo-app:theme'))).toBe('light');
    });

    test('the theme is applied before the app script runs (no light flash)', async ({ page }) => {
      // Block the bundle: only the inline script in index.html can set the theme.
      await page.route('**/assets/*.js', (route) => route.abort());
      await page.goto('/');

      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    });
  });
});

// Installable PWA: manifest + service worker, and the app still opens offline.
test('PWA: manifest is served and the app opens offline after the first visit', async ({
  page,
  context,
}) => {
  await page.goto('/');
  const manifest = await page.evaluate(async () => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    return link
      ? ((await (await fetch(link.href)).json()) as { name: string; icons: unknown[] })
      : null;
  });
  expect(manifest?.name).toBe('Todo');
  expect(manifest?.icons.length).toBeGreaterThanOrEqual(3);

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload(); // the page is now controlled by the service worker
  await page.getByPlaceholder(PLACEHOLDER).fill('오프라인 전에 추가');
  await page.getByPlaceholder(PLACEHOLDER).press('Enter');

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByPlaceholder(PLACEHOLDER)).toBeVisible();
  await expect(todoList(page)).toContainText('오프라인 전에 추가');
  await context.setOffline(false);
});

// Import merges instead of replacing: todos added on two devices both survive.
test('import merges a backup from another device into the current list', async ({
  browser,
}, testInfo) => {
  const pc = await browser.newPage();
  await pc.goto('/');
  await addTodo(pc, { title: 'PC에서 추가' });
  await pc.getByRole('button', { name: '데이터' }).click();
  const downloadPromise = pc.waitForEvent('download');
  await pc.getByRole('menuitem', { name: '내보내기' }).click();
  const backupPath = testInfo.outputPath('pc-backup.json');
  await (await downloadPromise).saveAs(backupPath);

  const phone = await browser.newPage(); // separate context = separate localStorage
  await phone.goto('/');
  await addTodo(phone, { title: '휴대폰에서 추가' });
  await phone.getByRole('button', { name: '데이터' }).click();
  const chooserPromise = phone.waitForEvent('filechooser');
  await phone.getByRole('menuitem', { name: '가져오기' }).click();
  await (await chooserPromise).setFiles(backupPath);
  await phone
    .getByRole('dialog', { name: '데이터 가져오기' })
    .getByRole('button', { name: '합치기' })
    .click();

  await expect(phone.getByText('1개 추가, 0개 갱신했습니다')).toBeVisible();
  expect((await checkboxTitles(phone)).sort()).toEqual(['PC에서 추가', '휴대폰에서 추가'].sort());
  await pc.close();
  await phone.close();
});
