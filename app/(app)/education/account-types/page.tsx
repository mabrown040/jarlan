import { AccountTypesArticle } from "@/components/education/account-types-article";
import { buildMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "401(k), Roth IRA, and HSA: Which Account Should You Use?",
  description:
    "The difference between traditional 401(k), Roth IRA, and HSA accounts — tax treatment, contribution limits, and the right order to fill them.",
  path: "/education/account-types",
});

export default function AccountTypesPage() {
  return <AccountTypesArticle />;
}
