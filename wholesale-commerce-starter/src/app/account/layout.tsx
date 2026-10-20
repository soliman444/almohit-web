import { redirectIfStaff } from "../../lib/session/access";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await redirectIfStaff();
  return children;
}
