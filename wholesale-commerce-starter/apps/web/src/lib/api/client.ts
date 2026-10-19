export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiClientError";
  }

  get statusCode() {
    return this.status;
  }
}

export class ApiUnavailableError extends Error {
  readonly code = "API_UNAVAILABLE";

  constructor(cause?: unknown) {
    super("API_UNAVAILABLE", { cause });
    this.name = "ApiUnavailableError";
  }
}
