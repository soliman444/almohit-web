"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  refreshStorefrontInvoice,
  refreshStorefrontTransaction,
  startStorefrontInvoicePayment,
} from "../../lib/commerce-actions";
import { commerceMessage, type CommerceErrorCode } from "../../lib/commerce-errors";

type Provider = { id: string; name: string };

export function InvoicePayPanel({
  invoiceId,
  paymentState,
  residual,
  providers,
}: {
  invoiceId: string;
  paymentState: string | null;
  residual: string;
  providers: Provider[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<CommerceErrorCode | null>(null);
  const [status, setStatus] = useState(paymentState);
  const [left, setLeft] = useState(residual);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [transactionState, setTransactionState] = useState<string | null>(null);
  const [redirectHtml, setRedirectHtml] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const formHost = useRef<HTMLDivElement>(null);
  const paid = status === "paid" || Number(left) <= 0;
  const failed = transactionState === "error" || transactionState === "cancel";
  const canPay = !paid && providers.length > 0 && Number(left) > 0;

  useEffect(() => {
    if (redirectUrl) {
      window.location.assign(redirectUrl);
      return;
    }
    if (!redirectHtml || !formHost.current) return;
    formHost.current.innerHTML = redirectHtml;
    const form = formHost.current.querySelector("form");
    form?.submit();
  }, [redirectHtml, redirectUrl]);

  useEffect(() => {
    if (!transactionId || paid || failed) return;
    let ticks = 0;
    const timer = setInterval(() => {
      ticks += 1;
      startTransition(async () => {
        const [invoice, transaction] = await Promise.all([
          refreshStorefrontInvoice(invoiceId),
          refreshStorefrontTransaction(transactionId),
        ]);
        if (invoice) {
          setStatus(invoice.paymentState);
          setLeft(invoice.residual);
        }
        if (transaction) setTransactionState(transaction.state);
      });
      if (ticks >= 20) clearInterval(timer);
    }, 2000);
    return () => clearInterval(timer);
  }, [failed, invoiceId, paid, transactionId]);

  if (paid) {
    return <p>This invoice is paid. Online payment is closed.</p>;
  }

  if (!canPay) {
    return (
      <p>
        Online payment is optional. Pay according to your payment terms, or wait until a provider
        is available.
      </p>
    );
  }

  function pay(providerId: string) {
    setError(null);
    startTransition(async () => {
      const result = await startStorefrontInvoicePayment(invoiceId, providerId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.alreadyPaid) {
        const invoice = await refreshStorefrontInvoice(invoiceId);
        setStatus(invoice?.paymentState ?? "paid");
        setLeft(invoice?.residual ?? "0.00");
        return;
      }
      setTransactionId(result.transactionId);
      setTransactionState(result.transactionState);
      if (result.redirectFormHtml) setRedirectHtml(result.redirectFormHtml);
      if (result.redirectUrl) setRedirectUrl(result.redirectUrl);
    });
  }

  return (
    <div>
      <p>Settle this invoice online. The amount is taken from the invoice remaining balance.</p>
      {providers.map((provider) => (
        <button
          key={provider.id}
          className="sf-btn"
          type="button"
          disabled={pending}
          onClick={() => pay(provider.id)}
        >
          <span>{pending ? "Starting payment…" : `Pay with ${provider.name}`}</span>
        </button>
      ))}
      {transactionState && !failed && <p>Payment status: {transactionState}. This page updates from Odoo.</p>}
      {failed && <p>The payment did not complete. The invoice is not marked paid.</p>}
      {error && <p className="error" role="alert">{commerceMessage(error)}</p>}
      <div
        ref={formHost}
        aria-hidden
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      />
    </div>
  );
}
