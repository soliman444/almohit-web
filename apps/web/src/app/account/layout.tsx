import { redirectIfPrismaStaff } from "../../lib/storefront-session";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await redirectIfPrismaStaff();
  return children;
}
