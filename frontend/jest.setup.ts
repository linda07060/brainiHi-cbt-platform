// Test environment setup for Jest + React Testing Library
// Place this file at frontend/jest.setup.ts (or update path in jest.config.js if different)

import '@testing-library/jest-dom/extend-expect';

// Optional: provide a minimal global window.matchMedia mock if your components use it
if (typeof window !== 'undefined' && !window.matchMedia) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// Optional: make console.error throw in tests to catch unexpected React errors
// Uncomment if you want failing tests on React prop-type/runtime errors
// const originalConsoleError = console.error;
// console.error = (...args: any[]) => {
//   originalConsoleError(...args);
//   throw new Error(args.map(String).join(' '));
// };