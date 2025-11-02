import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Box, Typography, TextField, Button, Pagination } from '@mui/material';
import api from '../../lib/adminApi';
import styles from '../../styles/Admin.module.css';
import UserTable from '../../components/admin/UserTable';
import UserDetailModal from '../../components/admin/UserDetailModal';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';

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

  useEffect(() => {
    if (!user || user.role !== 'admin') {
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
      setUsers(res.data?.items || res.data || []);
      setTotalPages(res.data?.totalPages || 1);
    } catch (err) {
      setUsers([]);
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
    // For now, open detail modal (you can implement a dedicated edit screen)
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