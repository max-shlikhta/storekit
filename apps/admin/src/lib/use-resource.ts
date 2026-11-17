'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, type ApiError, toApiError } from './api';

type State<T> = { key: string; data?: T; error?: ApiError };

// Loads a GET endpoint and keeps the last data while a new key loads, so lists do not flicker.
export const useResource = <T>(path: string | null) => {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<State<T>>({ key: '' });
  const key = path === null ? '' : `${path}#${String(version)}`;

  useEffect(() => {
    if (path === null) {
      return undefined;
    }

    const controller = new AbortController();
    const requestKey = `${path}#${String(version)}`;

    api<T>(path, { signal: controller.signal }).then(
      (data) => {
        setState({ key: requestKey, data });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setState((previous) => ({
            key: requestKey,
            data: previous.data,
            error: toApiError(error),
          }));
        }
      },
    );

    return () => {
      controller.abort();
    };
  }, [path, version]);

  const reload = useCallback(() => {
    setVersion((value) => value + 1);
  }, []);

  const replace = useCallback(
    (data: T) => {
      setState({ key, data });
    },
    [key],
  );

  return {
    replace,
    data: state.data,
    error: state.key === key ? state.error : undefined,
    loading: path !== null && state.key !== key,
    reload,
  };
};
