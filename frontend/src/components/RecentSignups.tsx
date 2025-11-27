import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Button,
  Tooltip,
  Typography,
  Box,
} from '@mui/material';
import { useUserModalControls } from '../hooks/useUserModalControls';
import UserDetailModal from './admin/UserDetailModal';

type Props = {
  activities: any[]; // activity rows from user_login_activity
};

function formatTime(raw?: string | null) {
  if (!raw) return '-';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw);
    return d.toLocaleString();
  } catch {
    return String(raw);
  }
}

export default function RecentSignups({ activities }: Props) {
  const { selectedUser, modalOpen, setModalOpen, handleView } = useUserModalControls();

  return (
    <>
      <Card>
        <CardHeader title={`Recent sign-ups (${activities?.length ?? 0})`} />
        <CardContent sx={{ p: 1 }}>
          <List dense sx={{ maxHeight: 320, overflowY: 'auto', pr: 1 }}>
            {activities && activities.length ? (
              activities.map((a: any, idx: number) => {
                const email = a?.email ?? a?.user_email ?? a?.email_address ?? a?.actor_email ?? '';
                const time = a?.created_at ?? a?.createdAt ?? null;
                return (
                  <ListItem
                    key={a.id ?? a.user_id ?? idx}
                    alignItems="flex-start"
                    sx={{ display: 'flex', gap: 1, py: 1, alignItems: 'center' }}
                    secondaryAction={
                      <Button size="small" onClick={() => handleView(a)} variant="outlined">
                        View
                      </Button>
                    }
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                          <Tooltip title={email || '-'} placement="top" arrow>
                            <Typography
                              variant="body1"
                              sx={{
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '22rem',
                              }}
                            >
                              {email || '—'}
                            </Typography>
                          </Tooltip>

                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                            {formatTime(time)}
                          </Typography>
                        </Box>
                      }
                      primaryTypographyProps={{ component: 'div' }}
                    />
                  </ListItem>
                );
              })
            ) : (
              <ListItem>
                <ListItemText primary="No recent sign-ups" />
              </ListItem>
            )}
          </List>
        </CardContent>
      </Card>

      <UserDetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        userId={selectedUser ? (selectedUser.id ?? selectedUser.user_id ?? selectedUser.user_uid ?? null) : null}
        userData={selectedUser}
        onUpdated={() => {}}
      />
    </>
  );
}