import React, { useEffect, useState } from 'react';
import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, Paper, Button, CircularProgress } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

export default function AdminUsers() {
  const { admin } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!admin) return;
    setLoading(true);
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    }).then(res => setUsers(res.data))
      .finally(() => setLoading(false));
  }, [admin]);

  if (!admin) return <Typography>Please login as admin.</Typography>;
  if (loading) return <CircularProgress />;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', mt: 6 }}>
      <Typography variant="h5" mb={3}>Manage Users</Typography>
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id}>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.plan}</TableCell>
                <TableCell>{u.active ? 'Active' : 'Disabled'}</TableCell>
                <TableCell>
                  <Button size="small" variant="outlined">Reset Password</Button>
                  <Button size="small" variant="outlined" color={u.active ? 'error' : 'success'}>
                    {u.active ? 'Disable' : 'Enable'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}