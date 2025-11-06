import React, { useEffect, useState } from "react";
import { Box, Paper, Typography, Button, List, ListItem, ListItemText, Divider } from "@mui/material";
import { logModelCall } from "../utils/aiHelpers";

/**
 * DevModePanel: shows raw logs (localStorage) and allows clearing.
 * Toggle dev mode by setting localStorage.dev_mode=true or call enableDevMode().
 */
export default function DevModePanel(): JSX.Element {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem("ai_prompt_logs");
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      setLogs(Array.isArray(parsed) ? parsed.slice().reverse() : []);
    } catch {
      setLogs([]);
    }
  }, []);

  const refresh = () => {
    const raw = localStorage.getItem("ai_prompt_logs");
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      setLogs(Array.isArray(parsed) ? parsed.slice().reverse() : []);
    } catch {
      setLogs([]);
    }
  };

  const clearLogs = () => {
    localStorage.removeItem("ai_prompt_logs");
    setLogs([]);
  };

  const simulateLog = async () => {
    const entry = {
      prompt: "Simulated prompt",
      model: "gpt-4.1",
      modelParameters: { temperature: 0.2 },
      response: { sample: "This is a simulated response" },
      timestamp: new Date().toISOString(),
    };
    await logModelCall(entry);
    refresh();
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Dev mode — AI logs</Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>Logs are stored locally (ai_prompt_logs). If you have a backend at /api/ai/logs, logs are posted there as well.</Typography>

        <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
          <Button variant="outlined" size="small" onClick={refresh}>Refresh</Button>
          <Button variant="contained" color="error" size="small" onClick={clearLogs}>Clear logs</Button>
          <Button variant="contained" size="small" onClick={simulateLog}>Simulate log</Button>
        </Box>

        <Divider sx={{ my: 1 }} />

        <List dense sx={{ maxHeight: 260, overflow: "auto" }}>
          {logs.length === 0 ? (
            <ListItem><ListItemText primary="No logs yet" /></ListItem>
          ) : (
            logs.map((l, i) => (
              <ListItem key={i} alignItems="flex-start">
                <ListItemText
                  primary={l.prompt}
                  secondary={
                    <>
                      <Typography component="span" variant="caption" sx={{ display: "block" }}>{l.timestamp} • model: {l.model}</Typography>
                      <Typography component="pre" variant="caption" sx={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(l.response, null, 2)}</Typography>
                    </>
                  }
                />
              </ListItem>
            ))
          )}
        </List>
      </Paper>
    </Box>
  );
}