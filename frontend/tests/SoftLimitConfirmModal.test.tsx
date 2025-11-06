import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SoftLimitConfirmModal from '../components/SoftLimitConfirmModal';

describe('SoftLimitConfirmModal', () => {
  it('calls onConfirm when Proceed clicked', () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();

    render(
      <SoftLimitConfirmModal
        open={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title="Confirm"
        message="Do it?"
        confirmLabel="Proceed"
        cancelLabel="Cancel"
      />
    );

    // Click Proceed
    const proceed = screen.getByRole('button', { name: /Proceed/i });
    fireEvent.click(proceed);

    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onClose when Cancel clicked', () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();

    render(
      <SoftLimitConfirmModal
        open={true}
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    const cancel = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancel);

    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});