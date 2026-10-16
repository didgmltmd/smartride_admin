import { test, expect } from '@playwright/test';

async function mockApi(page) {
  const users = [{ employeeId:'1001', name:'홍길동', role:'DRIVER', deleted:false }];
  const token = `header.${Buffer.from(JSON.stringify({ role:'ADMIN', exp:Math.floor(Date.now()/1000)+3600 })).toString('base64url')}.signature`;
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const pathname = new URL(req.url()).pathname;
    if (pathname.endsWith('/auth/login')) {
      if (req.postDataJSON().password !== 'valid-password') return route.fulfill({ status:401, json:{ success:false, message:'사원번호 또는 비밀번호를 확인해 주세요.' } });
      return route.fulfill({ json:{ success:true, data:{ accessToken:token, name:'관리자', employeeId:'admin' } } });
    }
    if (pathname.endsWith('/users/retired')) return route.fulfill({ json:{ data:[{ employeeId:'1002', name:'김기사', role:'DRIVER', deletedAt:'2026-03-10T09:00:00' }] } });
    if (pathname.endsWith('/users')) return route.fulfill({ json:{ data:users } });
    if (pathname.endsWith('/messages/7/reads')) return route.fulfill({ json:{ data:[] } });
    if (pathname.endsWith('/messages')) return route.fulfill({ json:{ data:[{ id:7, title:'운행 안내', content:'첫 번째 줄\n두 번째 줄', imageUrls:['https://example.com/one.png','https://example.com/two.png'] }] } });
    return route.fulfill({ json:{ success:true } });
  });
}
async function login(page) {
  await page.goto('/login');
  await page.getByLabel('사원번호', { exact:true }).fill('admin');
  await page.getByLabel('비밀번호', { exact:true }).fill('valid-password');
  await page.getByRole('button', { name:'로그인', exact:true }).click();
  await expect(page.getByRole('heading', { name:'사용자 관리', exact:true })).toBeVisible();
}
test.beforeEach(async ({ page }) => { await mockApi(page); });

test('login failure stays visible, and modal Escape restores focus', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByLabel('비밀번호', { exact:true })).toHaveValue('');
  await page.getByLabel('사원번호', { exact:true }).fill('admin');
  await page.getByLabel('비밀번호', { exact:true }).fill('wrong');
  await page.getByRole('button', { name:'로그인', exact:true }).click();
  await expect(page.getByRole('alert')).toHaveText('사원번호 또는 비밀번호를 확인해 주세요.');
  await page.getByLabel('비밀번호', { exact:true }).fill('valid-password');
  await page.getByRole('button', { name:'로그인', exact:true }).click();
  const trigger = page.getByRole('button', { name:'비밀번호 변경', exact:true });
  await trigger.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel('새 비밀번호', { exact:true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page.screenshot({ path:'test-results/users-desktop.png', fullPage:true });
});

test('notices keep all images, line breaks and readable confirmation modal', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name:'공지사항', exact:true }).click();
  await expect(page.getByRole('heading', { name:'운행 안내' })).toBeVisible();
  await expect(page.getByRole('link', { name:'이미지 1 보기' })).toBeVisible();
  await expect(page.getByRole('link', { name:'이미지 2 보기' })).toBeVisible();
  await expect(page.locator('article p')).toHaveCSS('white-space','pre-wrap');
  await page.getByRole('button', { name:'확인 현황' }).click();
  await expect(page.getByRole('dialog')).toContainText('홍길동');
  await page.getByRole('button', { name:'닫기', exact:true }).click();
  await page.getByRole('button', { name:'수정', exact:true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path:'test-results/notice-edit-desktop.png', fullPage:true });
  await page.keyboard.press('Escape');
});

test('mobile navigation and spreadsheet validation work without horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width:390, height:844 });
  await login(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('link', { name:'정산 엑셀 업로드', exact:true }).click();
  await page.locator('input[type=file]').setInputFiles({ name:'invalid.txt', mimeType:'text/plain', buffer:Buffer.from('bad') });
  await expect(page.getByRole('alert')).toContainText('.xlsx');
  await page.locator('input[type=file]').setInputFiles({ name:'taxi.xlsx', mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer:Buffer.from('sample') });
  await expect(page.getByRole('button', { name:'정산 자료 업로드' })).toBeEnabled();
  await page.screenshot({ path:'test-results/settlement-mobile.png', fullPage:true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('large directories support paging, instant search and readable modal scrolling', async ({ page }) => {
  await page.setViewportSize({ width:1440, height:900 });
  const users = Array.from({ length:103 }, (_, i) => ({ employeeId:String(1001+i), name:`테스트기사 ${String(i+1).padStart(3,'0')}`, role:'DRIVER' }));
  await page.route('**/api/admin/users', (route) => route.fulfill({ json:{ data:users } }));
  await login(page);
  await expect(page.locator('tbody tr')).toHaveCount(15);
  const table = page.getByRole('region', { name:'기사 목록', exact:true });
  await table.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  expect(await table.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await page.getByRole('button', { name:'다음 페이지' }).click();
  await expect(page.locator('tbody tr').first()).toContainText('1016');
  await expect.poll(() => table.evaluate((el) => el.scrollTop)).toBe(0);
  await page.getByRole('textbox', { name:'기사 사원번호 또는 이름 검색', exact:true }).fill('1103');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody')).toContainText('테스트기사 103');
  await expect(page.getByRole('button', { name:'다음 페이지' })).toBeDisabled();
  await page.getByRole('button', { name:'검색어 지우기' }).click();
  await page.screenshot({ path:'test-results/directory-desktop.png', fullPage:true });
  await page.getByRole('link', { name:'공지사항', exact:true }).click();
  await expect(page.getByLabel('제목', { exact:true })).not.toBeVisible();
  await page.getByRole('button', { name:'확인 현황' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name:'미확인자 103' })).toBeVisible();
  await dialog.getByLabel('미확인자 페이지당 인원').selectOption('50');
  const close = dialog.getByRole('button', { name:'닫기', exact:true });
  const before = await close.boundingBox();
  await dialog.locator('.directory-table').evaluate((el) => { el.scrollTop = el.scrollHeight; });
  expect((await close.boundingBox()).y).toBe(before.y);
  await expect(dialog.locator('thead th').first()).toBeInViewport();
  await dialog.getByRole('textbox', { name:'미확인자 사원번호 또는 이름 검색' }).fill('1103');
  await expect(dialog.locator('tbody')).toContainText('테스트기사 103');
  await dialog.getByRole('button', { name:'검색어 지우기' }).click();
  await page.screenshot({ path:'test-results/reads-desktop.png', fullPage:true });
  await page.setViewportSize({ width:390, height:844 });
  await expect(close).toBeInViewport();
  const pagination = await dialog.locator('.directory-pagination').boundingBox();
  const bounds = await dialog.boundingBox();
  expect(pagination.y + pagination.height).toBeLessThanOrEqual(bounds.y + bounds.height);
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.screenshot({ path:'test-results/reads-mobile.png', fullPage:true });
  await close.click();
});

test('creation errors are inline and folding a notice keeps its draft', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name:/기사 계정 추가/ }).click();
  await page.getByRole('button', { name:'사용자 생성', exact:true }).click();
  const employee = page.getByLabel('사원번호', { exact:true });
  await expect(employee).toBeFocused();
  await expect(employee).toHaveAttribute('aria-invalid','true');
  await expect(page.getByText('사원번호를 입력해 주세요.', { exact:true })).toBeVisible();
  await employee.fill('1002');
  await expect(employee).toHaveAttribute('aria-invalid','false');
  await page.getByRole('link', { name:'공지사항', exact:true }).click();
  const toggle = page.getByRole('button', { name:/새 공지 작성/ });
  await toggle.click();
  await page.getByRole('button', { name:'공지 등록', exact:true }).click();
  await expect(page.getByLabel('제목', { exact:true })).toBeFocused();
  await page.getByLabel('제목', { exact:true }).fill('작성 중인 공지');
  await toggle.click();
  await toggle.click();
  await expect(page.getByLabel('제목', { exact:true })).toHaveValue('작성 중인 공지');
  await page.screenshot({ path:'test-results/notice-compose-desktop.png', fullPage:true });
  await page.getByRole('textbox', { name:'공지 검색', exact:true }).fill('없는 공지');
  await expect(page.getByText('검색된 공지사항이 없습니다.')).toBeVisible();
});
