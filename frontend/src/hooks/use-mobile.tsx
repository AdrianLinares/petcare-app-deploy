/**
 * useIsMobile Hook
 * 
 * BEGINNER EXPLANATION:
 * This is a React custom hook that detects if the user is on a mobile device.
 * It watches the screen width and returns true if screen is smaller than 768px.
 * 
 * What's a Hook?
 * In React, hooks are special functions that let you "hook into" React features.
 * Custom hooks (like this one) let you reuse logic across different components.
 * 
 * How It Works:
 * 1. Creates a state variable to track if device is mobile
 * 2. Uses window.matchMedia() to listen for screen size changes
 * 3. Updates state whenever screen crosses the mobile breakpoint
 * 4. Returns boolean: true = mobile, false = desktop
 * 
 * Usage Example:
 * ```typescript
 * function MyComponent() {
 *   const isMobile = useIsMobile();
 *   
 *   return (
 *     <div>
 *       {isMobile ? <MobileMenu /> : <DesktopMenu />}
 *     </div>
 *   );
 * }
 * ```
 * 
 * Why 768px?
 * This is a standard breakpoint in responsive design:
 * - Below 768px: Tablets and phones (mobile)
 * - Above 768px: Laptops and desktops
 * 
 * Performance Note:
 * The hook adds an event listener for screen resize. React automatically
 * cleans it up when component unmounts (via the return statement in useEffect).
 */

import * as React from 'react';

// BEGINNER NOTE: Constants in SCREAMING_SNAKE_CASE are values that never change.
// 768 pixels is a common breakpoint between mobile and desktop sizes.
const MOBILE_BREAKPOINT = 768;

/**
 * Custom Hook: Check if Device is Mobile
 * 
 * @returns {boolean} true if screen width < 768px, false otherwise
 */
export function useIsMobile() {
  // State to track mobile status
  // Starts as undefined (we don't know yet), then becomes true/false
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  // useEffect runs after component mounts and sets up screen size monitoring
  React.useEffect(() => {
    // BEGINNER NOTE: window.matchMedia is a browser API that watches for CSS media query changes
    // It's like saying "tell me when the screen size crosses this threshold"
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    // Function that runs whenever screen size changes
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Listen for screen size changes (like rotating device or resizing browser)
    mql.addEventListener('change', onChange);

    // Check initial screen size immediately
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    // Cleanup function: Remove listener when component unmounts
    // BEGINNER NOTE: This prevents memory leaks. Always clean up event listeners!
    return () => mql.removeEventListener('change', onChange);
  }, []); // Empty array = only run once when component mounts

  // BEGINNER NOTE: !! converts undefined/null to false, and any truthy value to true
  // So if isMobile is undefined, this returns false
  return !!isMobile;
}
