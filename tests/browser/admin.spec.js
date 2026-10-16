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
