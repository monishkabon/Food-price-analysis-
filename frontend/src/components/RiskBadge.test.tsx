import { render, screen } from '@testing-library/react';
import { it, expect } from 'vitest';
import { RiskBadge } from './RiskBadge';
it('renders risk text as well as color', () => {
  render(<RiskBadge level="High" />);
  expect(screen.getByText('High risk')).toBeVisible();
});
