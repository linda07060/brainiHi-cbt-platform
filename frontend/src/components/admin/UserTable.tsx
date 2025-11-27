import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';

type Props = {
  users: any[];
  onView: (u: any) => void;
  onEdit: (u: any) => void;
  onToggleActive: (u: any) => void;
};

function parseDateValue(raw: any): Date | null {
  if (raw == null) return null;

  // If already a Date
  if (raw instanceof Date) {
    if (!isNaN(raw.getTime())) return raw;
    return null;
  }

  // If numeric: could be seconds or milliseconds
  if (typeof raw === 'number') {
    // If ms-like (>= 1e12) treat as ms
    if (raw >= 1e12) {
      return new Date(raw);
    }
    // If seconds (10 digits) assume seconds, convert to ms
    if (raw >= 1e9) {
      return new Date(raw * 1000);
    }
    // too small to be timestamp
    return null;
  }

  // If string: try Date constructor and numeric conversions
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // numeric string?
    if (/^-?\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      if (trimmed.length === 10) return new Date(n * 1000);
      return new Date(n);
    }

    // Try ISO / Date parse
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;

    return null;
  }

  // If object, try some common nested shapes
  if (typeof raw === 'object') {
    // try common nested keys
    const candidates = [
      raw.createdAt,
      raw.created_at,
      raw.created,
      raw.createdAtIso,
      raw.created_at_iso,
      raw.signupAt,
      raw.signup_at,
      raw.meta?.createdAt,
      raw.metadata?.created_at,
      raw.metadata?.createdAt,
    ];
    for (const c of candidates) {
      const parsed = parseDateValue(c);
      if (parsed) return parsed;
    }
  }

  // otherwise unknown type
  return null;
}

function formatDateYYYYMMDDHHMM(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export default function UserTable({
  users,
  onView,
  onEdit,
  onToggleActive,
}: Props) {
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
          {users.map((u) => {
            // Robustly find any common created timestamp fields
            const raw =
              u.createdAt ??
              u.created_at ??
              u.created ??
              u.createdAtIso ??
              u.created_at_iso ??
              u.signupAt ??
              u.signup_at ??
              u.meta?.createdAt ??
              u.metadata?.createdAt ??
              u.metadata?.created_at ??
              null;

            const date = parseDateValue(raw);
            const formatted = date ? formatDateYYYYMMDDHHMM(date) : '-';
            const title = date ? date.toISOString() : '';

            return (
              <TableRow key={u.id ?? u.user_uid}>
                <TableCell>{u.user_uid || u.id}</TableCell>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.phone || '-'}</TableCell>
                <TableCell>{u.plan || '-'}</TableCell>
                <TableCell title={title}>{formatted}</TableCell>
                <TableCell align="right">
                  <Tooltip title="View details">
                    <IconButton onClick={() => onView(u)} size="small">
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton onClick={() => onEdit(u)} size="small">
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={u.active ? 'Deactivate' : 'Activate'}>
                    <IconButton onClick={() => onToggleActive(u)} size="small">
                      <BlockIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}