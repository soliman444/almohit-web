"use client";

import { logoutAction } from "../../lib/actions/auth";

export function SignOutButton({
  className = "sf-nav-link",
  label = "Sign out",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <form className="sf-nav-signout" action={logoutAction}>
      <button className={className} type="submit">{label}</button>
    </form>
  );
}
