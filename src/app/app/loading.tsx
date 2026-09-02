import { PageContainer, Skeleton, Surface } from "../components/ui-next";

export default function TargetAppLoading() {
  return (
    <PageContainer width="wide">
      <Surface role="status" aria-label="Đang tải…">
        <Skeleton label="Đang tải…" />
      </Surface>
    </PageContainer>
  );
}
