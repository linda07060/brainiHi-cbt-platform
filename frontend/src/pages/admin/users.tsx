import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Box, Typography, TextField, Button, Pagination } from '@mui/material';
import api from '../../lib/adminApi';
import styles from '../../styles/Admin.module.css';
import UserTable from '../../components/admin/UserTable';
import UserDetailModal from '../../components/admin/UserDetailModal';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';

type AdminUsersResponse = {
  items?: any[];
  totalPages?: number;
  [k: string]: any;
};

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Hide the main site footer while this admin page is mounted.
  // This is a safe, client-side-only change that restores the footer when the user leaves the page.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const footer = document.querySelector('footer') as HTMLElement | null;
    if (!footer) return;
    const previousDisplay = footer.style.display;
    footer.style.display = 'none';
    return () => {
      footer.style.display = previousDisplay || '';
    };
  }, []);

  useEffect(() => {
    // allow admin session either from user context OR from adminAuth in localStorage
    const rawAdmin = typeof window !== 'undefined' ? localStorage.getItem('adminAuth') : null;
    const adminStored = rawAdmin ? JSON.parse(rawAdmin) : null;
    if ((!user || user.role !== 'admin') && !adminStored) {
      router.push('/admin/login');
      return;
    }
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users', { params: { q: query, page, limit: 20 } });

      const raw = res?.data ?? {};
      if (Array.isArray(raw)) {
        setUsers(raw);
        setTotalPages(1);
      } else {
        const data = raw as AdminUsersResponse;
        setUsers(data.items ?? []);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch (err) {
      setUsers([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    setPage(1);
    await fetchUsers();
  };

  const handleView = (u: any) => {
    setSelectedUser(u);
    setDetailOpen(true);
  };

  const handleEdit = (u: any) => {
    setSelectedUser(u);
    setDetailOpen(true);
  };

  const handleToggleActive = async (u: any) => {
    try {
      await api.put(`/admin/users/${u.id}`, { active: !u.active });
      fetchUsers();
    } catch {
      // ignore
    }
  };

  return (
    <AdminLayout>
      <Box>
        <Typography variant="h5">Users</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Search, view and manage users</Typography>

        <Box sx={{ display: 'flex', gap: 8, alignItems: 'center', mb: 2 }}>
          <TextField placeholder="Search by name, email or user id" value={query} onChange={(e) => setQuery(e.target.value)} size="small" sx={{ width: 360 }} />
          <Button variant="contained" onClick={handleSearch}>Search</Button>
        </Box>

        <div className={styles.tableWrap}>
          <UserTable users={users} onView={handleView} onEdit={handleEdit} onToggleActive={handleToggleActive} />
        </div>

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination count={totalPages} page={page} onChange={(_e, p) => setPage(p)} />
        </Box>

        <UserDetailModal
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          userId={selectedUser?.id || null}
          userData={selectedUser}
          onUpdated={() => { fetchUsers(); }}
        />
      </Box>
    </AdminLayout>
  );
}