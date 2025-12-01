import React from 'react';
import { FormControlLabel, Checkbox } from '@mui/material';

export default function AgeConfirmationCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <FormControlLabel
      control={<Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} />}
      label="I confirm that I am at least 16 years old (or the minimum age required in my jurisdiction)."
    />
  );
}