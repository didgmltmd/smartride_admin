import { it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NoticeReadsModal from '../src/components/NoticeReadsModal';
import { getMessageReads } from '../src/api/notices';
import { getUsers } from '../src/api/users';
vi.mock('../src/api/notices', () => ({ getMessageReads: vi.fn() }));
vi.mock('../src/api/users', () => ({ getUsers: vi.fn() }));
function deferred() { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; }
it('ignores the late response from a previously selected notice', async () => {
  const a = deferred();
  getMessageReads.mockImplementation((id) => id === 'A' ? a.promise : Promise.resolve({ data: [] }));
  getUsers.mockResolvedValue({ data: [{ employeeId: '1', name: '기사 하나', role: 'DRIVER', deleted: false }] });
  const view = render(<NoticeReadsModal notice={{ id: 'A', title: '공지 A' }} onClose={() => {}} />);
  view.rerender(<NoticeReadsModal notice={{ id: 'B', title: '공지 B' }} onClose={() => {}} />);
  await screen.findByText('기사 하나');
  a.resolve({ data: [{ employeeId: '1', name: '기사 하나' }] });
  await waitFor(() => expect(screen.getByText('기사 하나')).toBeInTheDocument());
  expect(screen.getByRole('button', { name: '미확인자 1' })).toBeInTheDocument();
  expect(screen.queryByText('미확인자가 없습니다.')).not.toBeInTheDocument();
});
it('shows a failed request as an error with retry, never as zero unread users', async () => {
  getMessageReads.mockRejectedValue(new Error('연결 실패'));
  getUsers.mockResolvedValue({ data: [] });
  render(<NoticeReadsModal notice={{ id: 'B', title: '공지 B' }} onClose={() => {}} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('연결 실패');
  expect(screen.queryByText('미확인자가 없습니다.')).not.toBeInTheDocument();
  getMessageReads.mockResolvedValue({ data: [] });
  await userEvent.click(screen.getByRole('button', { name: '다시 불러오기' }));
  expect(await screen.findByText('미확인자가 없습니다.')).toBeInTheDocument();
});
it('matches numeric and string employee IDs and excludes retired/admin users', async () => {
  getMessageReads.mockResolvedValue({ data: [{ employeeId: 1, name: '기사 하나' }] });
  getUsers.mockResolvedValue({ data: [{ employeeId: '1', role: 'DRIVER' }, { employeeId: '2', role: 'ADMIN' }, { employeeId: '3', role: 'DRIVER', deleted: true }] });
  render(<NoticeReadsModal notice={{ id: 'C', title: '공지 C' }} onClose={() => {}} />);
  expect(await screen.findByText('미확인자가 없습니다.')).toBeInTheDocument();
});
