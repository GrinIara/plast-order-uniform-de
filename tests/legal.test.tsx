import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Datenschutz } from '../src/content/legal';

describe('SPEC-2026-10-19-item-quantity', () => {
  it('AC-63: Datenschutzerklärung nennt Vor- und Nachname des Kindes als erhobene Daten', () => {
    const { container } = render(<Datenschutz />);
    const text = (container.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('Vor- und Nachname des Kindes, für das die Artikel bestimmt sind');
  });
});
