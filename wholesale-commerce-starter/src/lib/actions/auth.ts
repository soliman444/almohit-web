"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { ApiClientError, ApiUnavailableError } from "../odoo/errors";
import { destroySession } from "../session/staff";
import { isOdooAuthError, loginCustomer, logoutCurrentCustomer, registerCustomer } from "../odoo/auth";
import { getTradeApplication, submitTradeApplication } from "../odoo/trade";
import { parseAppRole, parseTradeKyc, tradeApplicationFromKyc, formValue as value } from "../trade-kyc";

export async function registerAction(formData: FormData) {
  const account = z.object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    role: z.enum(["merchant", "buyer", "distributor", "marketer"]),
  }).safeParse({
    name: value(formData, "name"),
    email: value(formData, "email").toLowerCase(),
    password: value(formData, "password"),
    role: parseAppRole(value(formData, "role")),
  });
  if (!account.success) redirect("/register?error=account");
  const kyc = parseTradeKyc(formData, account.data.role);
  if (!kyc.success) redirect("/register?error=kyc");

  try {
    await registerCustomer({
      name: account.data.name,
      email: account.data.email,
      password: account.data.password,
      phone: kyc.data.phone,
      role: account.data.role,
    });
    await loginCustomer({ email: account.data.email, password: account.data.password });
  } catch (error) {
    if (isOdooAuthError(error, "EMAIL_ALREADY_EXISTS")) redirect("/register?error=exists");
    if (isOdooAuthError(error, "PASSWORD_TOO_SHORT")) redirect("/register?error=password");
    if (isOdooAuthError(error, "INVALID_ROLE")) redirect("/register?error=role");
    if (error instanceof ApiUnavailableError) redirect("/register?error=unavailable");
    throw error;
  }

  try {
    const image = formData.get("shopImage");
    const { decodeUploadImage } = await import("../odoo/images");
    const shopImage = account.data.role === "merchant"
      ? await decodeUploadImage(image instanceof File ? image : null)
      : { imageBase64: undefined, imageContentType: undefined };
    await submitTradeApplication({
      ...tradeApplicationFromKyc(account.data.role, kyc.data),
      shopImageBase64: shopImage.imageBase64,
      shopImageContentType: shopImage.imageContentType,
    });
  } catch (error) {
    if (isOdooAuthError(error, "APPLICATION_ALREADY_PENDING")) redirect("/account/business");
    if (isOdooAuthError(error, "INVALID_IMAGE")) redirect("/account/business?error=image");
    if (isOdooAuthError(error, "INVALID_PAYMENT_METHOD")) redirect("/account/business?error=payment");
    if (isOdooAuthError(error, "INVALID_ROLE")) redirect("/account/business?error=role");
    if (error instanceof ApiUnavailableError) redirect("/account/business?error=unavailable");
    throw error;
  }

  await destroySession();
  redirect("/account/business");
}

export async function loginAction(formData: FormData) {
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  if (!email || !password) redirect("/login?error=invalid");

  try {
    const session = await loginCustomer({ email, password });
    if (session.isStaff) redirect("/");
  } catch (error) {
    if (isOdooAuthError(error, "INVALID_CREDENTIALS") || (error instanceof ApiClientError && error.status === 401)) {
      redirect("/login?error=invalid");
    }
    if (error instanceof ApiUnavailableError) redirect("/login?error=unavailable");
    throw error;
  }

  redirect("/account");
}

export async function logoutAction() {
  await logoutCurrentCustomer();
  redirect("/");
}

export async function submitBusinessRequestAction(formData: FormData) {
  const odoo = await import("../odoo/auth");
  const odooSession = await odoo.hasOdooSession();
  const sessionCustomer = odooSession ? await odoo.getCurrentCustomer() : null;
  if (!odooSession || !sessionCustomer) redirect("/login");

  const existing = await getTradeApplication();
  if (
    sessionCustomer.tradeStatus === "approved"
    || sessionCustomer.tradeStatus === "pending"
    || existing?.status === "approved"
    || existing?.status === "pending"
  ) {
    redirect("/account/business");
  }

  const role = parseAppRole(sessionCustomer.role ?? "merchant");
  const kyc = parseTradeKyc(formData, role);
  if (!kyc.success) redirect("/account/business?error=kyc");

  try {
    const image = formData.get("shopImage");
    const { decodeUploadImage } = await import("../odoo/images");
    const shopImage = role === "merchant"
      ? await decodeUploadImage(image instanceof File ? image : null)
      : { imageBase64: undefined, imageContentType: undefined };
    await submitTradeApplication({
      ...tradeApplicationFromKyc(role, kyc.data),
      shopImageBase64: shopImage.imageBase64,
      shopImageContentType: shopImage.imageContentType,
    });
  } catch (error) {
    if (isOdooAuthError(error, "APPLICATION_ALREADY_PENDING") || isOdooAuthError(error, "APPLICATION_ALREADY_APPROVED")) {
      redirect("/account/business");
    }
    if (isOdooAuthError(error, "INVALID_IMAGE")) redirect("/account/business?error=image");
    if (isOdooAuthError(error, "INVALID_PAYMENT_METHOD")) redirect("/account/business?error=payment");
    if (isOdooAuthError(error, "INVALID_ROLE")) redirect("/account/business?error=role");
    if (isOdooAuthError(error, "UNAUTHENTICATED") || (error instanceof ApiClientError && error.status === 401)) {
      redirect("/login");
    }
    if (error instanceof ApiUnavailableError) redirect("/account/business?error=unavailable");
    throw error;
  }
  redirect("/account/business?status=submitted");
}
