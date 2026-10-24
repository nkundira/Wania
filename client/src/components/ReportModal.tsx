import { useState } from 'react';
import { getErrorMessage } from '../lib/api';
import { usersApi } from '../services/wania';
import { useToast } from '../contexts/ToastContext';
import { Modal } from './Modal';
import { Spinner } from './ui';

const REASONS = [
  { value: 'spam', label: 'Spam or scam' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate', label: 'Hate speech' },
  { value: 'nudity', label: 'Nudity or sexual content' },
  { value: 'violence', label: 'Violence or dangerous content' },
  { value: 'misinformation', label: 'False information' },
  { value: 'other', label: 'Something else' },
];

type ReportModalProps = {
  open: boolean;
  onClose: () => void;
  targetType: 'user' | 'post' | 'comment' | 'story' | 'message';
  targetId: string;
};

export function ReportModal({ open, onClose, targetType, targetId }: ReportModalProps) {
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await usersApi.report({ targetType, targetId, reason, details: details.trim() || undefined });
      success('Report submitted. Our team will review it.');
      setDetails('');
      setReason('spam');
      onClose();
    } catch (err) {
      error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Report ${targetType}`}
      description="Reports are confidential. The person you report will not be notified."
      size="sm"
    >
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1">
          {REASONS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-zinc-300 hover:bg-white/[0.04]"
            >
              <input
                type="radio"
                name="reason"
                value={option.value}
                checked={reason === option.value}
                onChange={() => setReason(option.value)}
                className="h-4 w-4 accent-violet-500"
              />
              {option.label}
            </label>
          ))}
        </div>
        <textarea
          className="input min-h-[80px] resize-none"
          placeholder="Add any details (optional)"
          maxLength={1000}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
        />
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading && <Spinner className="h-4 w-4" />}
            Submit report
          </button>
        </div>
      </form>
    </Modal>
  );
}
