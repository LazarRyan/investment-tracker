interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success?: boolean;
  ok: boolean;
  status?: number;
  json: () => Promise<T>;
}

/**
 * Wrapper around fetch that adds the internal request token
 * and handles common response patterns
 */
export async function internalFetch(
  url: string,
  options: FetchOptions = {}
): Promise<ApiResponse> {
  try {
    // Ensure headers object exists
    const headers = {
      ...options.headers,
      'X-Internal-Request-Token': process.env.NEXT_PUBLIC_INTERNAL_REQUEST_TOKEN || '',
    };

    // Make the fetch request
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Check if response is ok
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    // Return standardized response
    return {
      data: data,
      ok: response.ok,
      status: response.status,
      success: response.ok,
      error: !response.ok ? data?.error || response.statusText : undefined,
      json: async () => data,
    };
  } catch (error) {
    console.error('API request failed:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Request failed',
      success: false,
      json: async () => ({ error: 'Request failed' }),
    };
  }
} 