import { useState } from 'react';

export function useToast() {
  const toast = ({ title, description, variant }: { title?: string, description?: string, variant?: string }) => {
    const message = `${title ? title + ': ' : ''}${description || ''}`;
    if (typeof window !== 'undefined') {
      // Usar alert de fallback sencillo para evitar dependencias pesadas y fallos de compilación
      alert(message);
    } else {
      console.log(`[Toast] ${message} (${variant})`);
    }
  };
  return { toast };
}
