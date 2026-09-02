"use client";

import { Button, ErrorState, PageContainer, translate } from "../components/ui-next";

export default function TargetAppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageContainer width="wide">
      <ErrorState
        title={translate("vi", "error.internal.title")}
        description={translate("vi", "error.internal.description")}
        action={<Button onClick={reset}>{translate("vi", "common.tryAgain")}</Button>}
      />
    </PageContainer>
  );
}
