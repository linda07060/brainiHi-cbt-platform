import { useState } from 'react';
import adminApi from '../lib/adminApi'; // adjust path if your adminApi is elsewhere

export function useUserModalControls() {
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Try to fetch a full user record; fallback to the provided row object
  async function handleView(rowOrUser: any) {
    // If the passed object already contains phone or created fields, use it directly
    if (rowOrUser?.phone || rowOrUser?.createdAt || rowOrUser?.created_at) {
      setSelectedUser(rowOrUser);
      setModalOpen(true);
      return;
    }

    const id = rowOrUser?.id ?? rowOrUser?.user_id ?? rowOrUser?.user_uid;
    const email = rowOrUser?.email;

    try {
      let userRes: any = null;

      if (id) {
        // Try single-user endpoint first
        const res = await adminApi.get(`/admin/users/${encodeURIComponent(String(id))}`);
        userRes = res?.data ?? null;
      } else if (email) {
        // Try query by email
        const res = await adminApi.get(`/admin/users`, { params: { email } });
        if (Array.isArray(res?.data) && res.data.length) userRes = res.data[0];
        else userRes = res?.data ?? null;
      }

      // If fetch gave nothing, fallback to the row object
      setSelectedUser(userRes ?? rowOrUser);
    } catch (err) {
      // On any error, open modal with the activity row object (so UI still works)
      console.warn('useUserModalControls: failed to fetch full user, falling back to row', err);
      setSelectedUser(rowOrUser);
    }

    setModalOpen(true);
  }

  return { selectedUser, modalOpen, setModalOpen, setSelectedUser, handleView };
}

export default useUserModalControls;