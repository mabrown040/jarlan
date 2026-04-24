import { AccountWorkspace } from "@/components/product/account-workspace";

// Force dynamic — the workspace uses useSearchParams() to detect
// `?checkout=success`, which requires a Suspense boundary or dynamic
// rendering. Dynamic is simpler here since the page is always
// authenticated and not SEO-critical.
export const dynamic = "force-dynamic";

export default function AccountPage() {
  return <AccountWorkspace />;
}
