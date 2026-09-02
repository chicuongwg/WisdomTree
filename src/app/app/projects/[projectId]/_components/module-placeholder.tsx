import type { UiLocale } from "@/modules/auth/profile";
import { Surface, translate, type UiNextMessageKey } from "../../../../components/ui-next";

export function ProjectModulePlaceholder({
  locale,
  titleKey,
  descriptionKey,
}: {
  locale: UiLocale;
  titleKey: UiNextMessageKey;
  descriptionKey: UiNextMessageKey;
}) {
  return (
    <section className="ui-next-project-module" aria-labelledby="project-module-title">
      <h2 id="project-module-title">{translate(locale, titleKey)}</h2>
      <Surface className="ui-next-project-module__placeholder" tone="sunken">
        <p>{translate(locale, descriptionKey)}</p>
      </Surface>
    </section>
  );
}
