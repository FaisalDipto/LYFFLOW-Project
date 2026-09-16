import { useState } from 'react';

// Calls `onChange` during render when `key` changes. React's recommended alternative to
// resetting state inside an effect: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
export function useOnKeyChange(key, onChange) {
  // Wrapped in functions so a function-valued key is stored, not invoked.
  const [prevKey, setPrevKey] = useState(() => key);
  if (prevKey !== key) {
    setPrevKey(() => key);
    onChange();
  }
}
