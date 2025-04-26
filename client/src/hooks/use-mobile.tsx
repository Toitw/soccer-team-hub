import { useState, useEffect } from 'react';

// Hook to detect if the current device is mobile
export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768); // Consider devices with width < 768px as mobile
    };

    // Check on initial load
    checkIfMobile();

    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  return isMobile;
}

// Alias for useIsMobile (used in some components)
export const useIsMobile = useMobile;

export default useMobile;