/**
 * Tests the Analytics "Practice" flow: clicking Practice opens the SoftLimitConfirmModal.
 *
 * Requires: jest, @testing-library/react, @testing-library/jest-dom, jest-environment-jsdom
 * Mock axios to return analytics data.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AnalyticsPage from '../pages/analytics';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AnalyticsPage - Practice flow', () => {
  beforeEach(() => {
    mockedAxios.get.mockReset();
    mockedAxios.post?.mockReset?.();
  });

  it('renders analytics and opens confirmation modal when Practice clicked', async () => {
    // Mock the analytics GET
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        attemptsCount: 2,
        weakAreas: [{ area: 'Algebra', misses: 3, recommendedPractice: 8, history: [1,2,3] }],
      },
    });

    const { getByText, findByText } = render(<AnalyticsPage />);

    // Wait for the weak area label to appear
    await findByText('Weak areas & practice');

    // Find the Practice button for the weak area and click it
    const practiceButton = await screen.findByRole('button', { name: /Practice/i });
    fireEvent.click(practiceButton);

    // After clicking Practice we expect the confirmation modal to appear (title)
    await waitFor(() => {
      expect(screen.getByText(/Proceed with practice\?/i)).toBeInTheDocument();
    });
  });
});