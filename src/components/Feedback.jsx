import { AlertCircle, CheckCircle2 } from 'lucide-react';
export default function Feedback({ value }) {
  if (!value?.text) return null;
  const failed = value.type === 'error';
  const Icon = failed ? AlertCircle : CheckCircle2;
  return <div role={failed ? 'alert' : 'status'} className={`feedback ${failed ? 'feedback-error' : 'feedback-success'}`}>
    <Icon size={18} aria-hidden="true" className="mt-0.5 shrink-0" /><span>{value.text}</span>
  </div>;
}
