/**
 * Typed REST API client boundary for the Automotive Platform.
 * Points to the future Spring Boot / Apache APISIX gateway.
 * Backend business endpoints are currently skeletons and not yet implemented.
 */

export const API_BASE_URL =
  (typeof globalThis !== 'undefined' &&
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
      ?.NEXT_PUBLIC_API_URL) ||
  'http://localhost:8080';

export class UnimplementedApiError extends Error {
  constructor(endpoint: string) {
    super(
      `Endpoint ${endpoint} is not yet implemented. Spring Boot microservices are currently in skeleton phase.`
    );
    this.name = 'UnimplementedApiError';
  }
}

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    if (!res.ok) {
      throw new Error(`API request failed [${res.status}]: ${res.statusText}`);
    }
    return res.json();
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new UnimplementedApiError(endpoint);
    }
    throw error;
  }
}

