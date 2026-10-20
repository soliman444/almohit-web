import { ApiClientError, ApiUnavailableError } from "./errors";

export type SafeApiResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      reason: "API_UNAVAILABLE";
    };

export async function safeApiCall<T>(
  action: () => Promise<T>,
): Promise<SafeApiResult<T>> {
  try {
    return {
      ok: true,
      data: await action(),
    };
  } catch (error) {
    if (
      error instanceof ApiUnavailableError
      || (error instanceof ApiClientError && error.status >= 500)
    ) {
      return {
        ok: false,
        reason: "API_UNAVAILABLE",
      };
    }

    throw error;
  }
}