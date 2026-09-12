"use client";

import { useEffect, useRef, useState } from "react";

// Server action state persists until its next response. Hide that prior response
// while the user corrects the form, then reveal only the latest response.
export function useFormActionErrorVisibility(state: object) {
  const [areErrorsVisible, setAreErrorsVisible] = useState(true);
  const previousState = useRef(state);

  useEffect(() => {
    if (previousState.current === state) return;

    previousState.current = state;
    setAreErrorsVisible(true);
  }, [state]);

  return {
    areErrorsVisible,
    dismissErrors: () => setAreErrorsVisible(false),
  };
}
