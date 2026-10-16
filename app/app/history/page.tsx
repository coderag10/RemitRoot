"use client";

import { ActivityList } from "@/components/ActivityList";
import { OnboardCard } from "@/components/Onboarding";
import { Card, PageTitle } from "@/components/ui/Card";
import { EmptyState, ErrorNotice, Skeleton } from "@/components/ui/States";
import { errorKey } from "@/lib/chain/errors";
import { useI18n } from "@/lib/i18n";
import { useActivity } from "@/lib/queries";
import { useSession } from "@/lib/session";

export default function HistoryPage() {
  const { t } = useI18n();
  const { session } = useSession();
  const activity = useActivity(session?.publicKey ?? null, 40);

  if (!session) return <OnboardCard />;
  const items = activity.data?.filter((item) => item.kind !== "withdrawn" && item.kind !== "repaid") ?? [];
  return (
    <>
      <PageTitle lead={t("history.loadingNote")}>{t("history.title")}</PageTitle>
      <Card>
        {activity.isLoading ? (
          <Skeleton lines={6} />
        ) : activity.error && !activity.data ? (
          <ErrorNotice message={t(errorKey(activity.error))} onRetry={() => void activity.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState icon="history">{t("history.empty")}</EmptyState>
        ) : (
          <ActivityList items={items} perspective="worker" />
        )}
      </Card>
    </>
  );
}
