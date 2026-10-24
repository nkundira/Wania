import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { getErrorMessage } from '../lib/api';
import { postsApi } from '../services/wania';
import type { UserSummary } from '../types';
import { useToast } from '../contexts/ToastContext';
import { Modal } from './Modal';
import { EmptyState, Spinner } from './ui';
import { UserRow } from './UserRow';

export function LikesModal({ open, onClose, postId }: { open: boolean; onClose: () => void; postId: string }) {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { error } = useToast();

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    postsApi
      .likes(postId)
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch((err) => {
        if (!cancelled) error(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, postId, error]);

  return (
    <Modal open={open} onClose={onClose} title="Likes" size="sm">
      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner className="text-grape-400" />
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon={Heart} title="No likes yet" className="py-10" />
      ) : (
        <div className="divide-y divide-white/[0.05]">
          {users.map((item) => (
            <UserRow key={item.id} user={item} />
          ))}
        </div>
      )}
    </Modal>
  );
}
