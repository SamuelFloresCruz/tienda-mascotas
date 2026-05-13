import type { CSSProperties } from 'react';
import { Toaster as Sonner } from 'sonner';

const Toaster = () => (
  <Sonner
    richColors
    position="top-right"
    closeButton
    className="toaster group"
    style={
      {
        '--normal-bg': 'var(--popover)',
        '--normal-text': 'var(--popover-foreground)',
        '--normal-border': 'var(--border)',
      } as CSSProperties
    }
  />
);

export { Toaster };
