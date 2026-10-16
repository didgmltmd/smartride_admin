import { useRef, useState } from 'react';
// The ref also blocks two submissions before React has rendered disabled buttons.
export function useTask() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  async function run(task) {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try { return await task(); }
    finally { lock.current = false; setBusy(false); }
  }
  return { busy, run };
}
