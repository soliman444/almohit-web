import { Injectable } from "@nestjs/common";
import { getOdooConfig } from "./odoo.config";
import {
  OdooAuthenticationError,
  OdooRpcError,
  OdooUnavailableError,
} from "./odoo.errors";
import type { OdooVersionInfo } from "./odoo.types";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const xmlrpc = require("xmlrpc") as typeof import("xmlrpc");
type XmlRpcClient = ReturnType<typeof xmlrpc.createClient>;

@Injectable()
export class OdooClient {
  private readonly config = getOdooConfig();

  private readonly commonClient: XmlRpcClient;
  private readonly objectClient: XmlRpcClient;

  private uid: number | null = null;

  constructor() {
    const url = new URL(this.config.url);

    const clientOptions = {
      host: url.hostname,
      port: Number(url.port || 80),
      path: "",
    };

    this.commonClient = xmlrpc.createClient({
      ...clientOptions,
      path: "/xmlrpc/2/common",
    });

    this.objectClient = xmlrpc.createClient({
      ...clientOptions,
      path: "/xmlrpc/2/object",
    });
  }

  private methodCall<T>(
    client: XmlRpcClient,
    method: string,
    params: unknown[],
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      client.methodCall(method, params, (error, value) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(value as T);
      });
    });
  }

  async version(): Promise<OdooVersionInfo> {
    try {
      return await this.methodCall<OdooVersionInfo>(
        this.commonClient,
        "version",
        [],
      );
    } catch (error) {
      throw this.mapTransportError(error);
    }
  }

  async authenticate(force = false): Promise<number> {
    if (this.uid !== null && !force) {
      return this.uid;
    }

    try {
      const uid = await this.methodCall<number | false>(
        this.commonClient,
        "authenticate",
        [
          this.config.database,
          this.config.username,
          this.config.apiKey,
          {},
        ],
      );

      if (!uid) {
        throw new OdooAuthenticationError();
      }

      this.uid = uid;

      return uid;
    } catch (error) {
      if (error instanceof OdooAuthenticationError) {
        throw error;
      }

      throw this.mapTransportError(error);
    }
  }

  async executeKw<T>(
    model: string,
    method: string,
    args: unknown[] = [],
    kwargs: Record<string, unknown> = {},
  ): Promise<T> {
    const uid = await this.authenticate();

    try {
      return await this.methodCall<T>(
        this.objectClient,
        "execute_kw",
        [
          this.config.database,
          uid,
          this.config.apiKey,
          model,
          method,
          args,
          kwargs,
        ],
      );
    } catch (error) {
      if (this.looksLikeAuthenticationError(error)) {
        this.uid = null;
        throw new OdooAuthenticationError();
      }

      if (this.looksLikeTransportError(error)) {
        throw new OdooUnavailableError(error);
      }

      throw new OdooRpcError(
        `Odoo RPC failed: ${model}.${method}`,
        error,
      );
    }
  }

  private mapTransportError(error: unknown): Error {
    if (this.looksLikeTransportError(error)) {
      return new OdooUnavailableError(error);
    }

    return new OdooRpcError("Odoo XML-RPC request failed", error);
  }

  private looksLikeTransportError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const text = `${error.name} ${error.message}`.toLowerCase();

    return (
      text.includes("econnrefused") ||
      text.includes("etimedout") ||
      text.includes("enotfound") ||
      text.includes("socket hang up")
    );
  }

  private looksLikeAuthenticationError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const text = error.message.toLowerCase();

    return (
      text.includes("access denied") ||
      text.includes("authentication") ||
      text.includes("invalid login")
    );
  }
}