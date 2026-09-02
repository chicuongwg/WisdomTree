import type { UiLocale } from "@/modules/auth/profile";
import {
  PageContainer,
  PageHeader,
  Surface,
  translate,
  type UiNextMessageKey,
} from "../../components/ui-next";

export function PagePlaceholder({
  locale,
  titleKey,
  descriptionKey,
  detail,
}: {
  locale: UiLocale;
  titleKey: UiNextMessageKey;
  descriptionKey: UiNextMessageKey;
  detail?: string;
}) {
  return (
    <PageContainer width="wide">
      <div className="ui-next-stack">
        <PageHeader
          title={translate(locale, titleKey)}
          description={translate(locale, descriptionKey)}
        />
        <Surface className="ui-next-shell-placeholder" tone="sunken">
          <div>
            <h2>{translate(locale, "page.placeholder.title")}</h2>
            <p>{detail ?? translate(locale, "page.placeholder.description")}</p>
          </div>
        </Surface>
      </div>
    </PageContainer>
  );
}
