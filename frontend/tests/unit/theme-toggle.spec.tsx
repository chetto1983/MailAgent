
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider as NextThemeProvider } from 'next-themes';
import { ThemeToggle } from '@/components/ui/theme-toggle';

describe('ThemeToggle', () => {
  it('renders correctly and toggles theme', () => {
    render(
      <NextThemeProvider attribute="class" defaultTheme="light">
        <ThemeToggle />
      </NextThemeProvider>
    );

    const toggleButton = screen.getByLabelText('Toggle theme');
    expect(toggleButton).toBeInTheDocument();

    // Initial theme is light
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // Click to toggle to dark
    fireEvent.click(toggleButton);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('light')).toBe(false);

    // Click to toggle back to light
    fireEvent.click(toggleButton);
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
