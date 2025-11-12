// Suppress specific React warnings in development
if (process.env.NODE_ENV === 'development') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    // Suppress findDOMNode deprecation warnings from Ant Design
    if (args[0] && typeof args[0] === 'string' && args[0].includes('findDOMNode is deprecated')) {
      return;
    }
    // Suppress React DevTools warnings
    if (args[0] && typeof args[0] === 'string' && args[0].includes('Download the React DevTools')) {
      return;
    }
    originalWarn.apply(console, args);
  };
}
