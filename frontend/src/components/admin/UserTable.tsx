import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Tooltip } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';

type Props = {
  users: any[];
  onView: (u: any) => void;
  onEdit: (u: any) => void;
  onToggleActive: (u: any) => void;
};

export default function UserTable({ users, onView, onEdit, onToggleActive }: Props) {
  return (
    <TableContainer component={Paper}>
      <Table size="small" aria-label="users table">
        <TableHead>
          <TableRow>
            <TableCell>User ID</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>Plan</TableCell>
            <TableCell>Created</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.user_uid || u.id}</TableCell>
              <TableCell>{u.name}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell>{u.phone || '-'}</TableCell>
              <TableCell>{u.plan}</TableCell>
              <TableCell>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</TableCell>
              <TableCell align="right">
                <Tooltip title="View details">
                  <IconButton onClick={() => onView(u)} size="small"><VisibilityIcon /></IconButton>
                </Tooltip>
                <Tooltip title="Edit">
                  <IconButton onClick={() => onEdit(u)} size="small"><EditIcon /></IconButton>
                </Tooltip>
                <Tooltip title={u.active ? 'Deactivate' : 'Activate'}>
                  <IconButton onClick={() => onToggleActive(u)} size="small"><BlockIcon /></IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}