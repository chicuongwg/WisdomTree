"use client";

import { Button } from "../components/ui-next/primitives/button";
import { ErrorState } from "../components/ui-next/feedback/states";
import { PageContainer } from "../components/ui-next/layout/primitives";
import { translate } from "../components/ui-next/localization";

export default function TargetAppError({
  error: _error,
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
