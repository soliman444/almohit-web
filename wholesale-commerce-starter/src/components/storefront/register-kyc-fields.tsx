"use client";

import { useState } from "react";
import { type AppRole, parseAppRole } from "../../lib/trade-kyc";
import { TradeKycFields } from "./trade-kyc-fields";

export function RegisterKycFields({ defaultRole = "merchant" }: { defaultRole?: AppRole }) {
  const [role, setRole] = useState<AppRole>(defaultRole);

  return (
    <>
      <section className="sf-biz-block">
        <h2>Account type</h2>
        <div className="sf-biz-grid">
          <label className="sf-biz-field is-span-2">Role
            <select
              name="role"
              value={role}
              required
              onChange={(event) => setRole(parseAppRole(event.target.value))}
            >
              <option value="merchant">Merchant — shop buying wholesale</option>
              <option value="buyer">Buyer — sourcing office</option>
              <option value="distributor">Distributor — delivery coverage</option>
              <option value="marketer">Marketer — enroll shop merchants</option>
            </select>
          </label>
        </div>
      </section>
      <TradeKycFields role={role} />
    </>
  );
}
