import { render, screen } from '@testing-library/react';
import { it, expect } from 'vitest';
import { MetricCard } from './MetricCard';
it('exposes its label, value and trend', () => {
  render(<MetricCard label="Current average" value="Rs. 242.50" change="+4.2%" trend="up" />);
  expect(screen.getByText('Current average')).toBeVisible();
  expect(screen.getByText('Rs. 242.50')).toBeVisible();
  expect(screen.getByLabelText('increased by +4.2%')).toBeVisible();
});
