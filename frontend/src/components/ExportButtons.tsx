import React from "react";
import { Box, Button } from "@mui/material";
import { QuestionItem, exportQuestions } from "../utils/aiHelpers";

export default function ExportButtons({ questions }: { questions: QuestionItem[] }) {
  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      <Button variant="outlined" onClick={() => exportQuestions(questions, "json")}>Export JSON</Button>
      <Button variant="outlined" onClick={() => exportQuestions(questions, "csv")}>Export CSV</Button>
    </Box>
  );
}