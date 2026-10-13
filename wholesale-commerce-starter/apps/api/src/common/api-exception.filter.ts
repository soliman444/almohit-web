import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Response } from "express";
import type { ApiErrorResponse } from "@almohit/contracts";

function isPrismaError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "name" in error &&
      String((error as { name: string }).name).startsWith("Prisma"),
  );
}

export function toApiError(exception: unknown): ApiErrorResponse {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const payload = exception.getResponse();
    const message =
      typeof payload === "string"
        ? payload
        : typeof payload === "object" && payload && "message" in payload
          ? Array.isArray((payload as { message: unknown }).message)
            ? "Invalid request"
            : String((payload as { message: unknown }).message)
          : exception.message;
    const code =
      typeof payload === "object" && payload && "code" in payload
        ? String((payload as { code: unknown }).code)
        : status === 400
          ? "INVALID_REQUEST"
          : status === 401
            ? "UNAUTHORIZED"
            : status === 403
              ? "FORBIDDEN"
              : status === 404
                ? "NOT_FOUND"
                : "INTERNAL_ERROR";
    return {
      statusCode: status,
      code,
      message: status >= 500 ? "Internal server error" : message,
    };
  }

  if (isPrismaError(exception)) {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    };
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    code: "INTERNAL_ERROR",
    message: "Internal server error",
  };
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const body = toApiError(exception);
    if (process.env.NODE_ENV !== "production" && body.statusCode >= 500) {
      console.error(exception);
    }
    response.status(body.statusCode).json(body);
  }
}
