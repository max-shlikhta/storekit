export type ErrorDetail = { path: string; message: string };

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ErrorDetail[];

  constructor(status: number, code: string, message: string, details: ErrorDetail[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const UNAUTHORIZED_EVENT = 'storekit:unauthorized';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
};

type ErrorPayload = { error?: { code?: string; message?: string; details?: ErrorDetail[] } };

export const api = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(`/api/v1${path}`, {
      method: options.method ?? 'GET',
      headers: options.body === undefined ? {} : { 'content-type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'same-origin',
      cache: 'no-store',
      signal: options.signal,
    });
  } catch (error) {
    if (options.signal?.aborted) {
      throw error;
    }

    throw new ApiError(0, 'NETWORK_ERROR', 'Network request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const error = (payload as ErrorPayload | undefined)?.error;

    if (response.status === 401 && !path.startsWith('/auth/')) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }

    throw new ApiError(
      response.status,
      error?.code ?? 'INTERNAL_ERROR',
      error?.message ?? response.statusText,
      error?.details ?? [],
    );
  }

  return payload as T;
};

export const toApiError = (error: unknown) =>
  error instanceof ApiError ? error : new ApiError(0, 'INTERNAL_ERROR', String(error));

// The first field-level message the API gave, or its general one.
export const errorText = (error: unknown) => {
  const apiError = toApiError(error);

  return apiError.details[0]?.message ?? apiError.message;
};
