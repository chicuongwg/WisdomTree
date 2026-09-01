"use client";

import { useEffect, useState } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import {
  Button,
  Dialog,
  Drawer,
  EmptyState,
  ErrorState,
  Inline,
  PageContainer,
  PageHeader,
  Progress,
  ResearchContent,
  SaveStatus,
  Select,
  Skeleton,
  SkipLink,
  Stack,
  StatusBadge,
  Surface,
  TextArea,
  TextField,
  translate,
} from "../components/ui-next";

const multilingualSamples = [
  "Tiếng Việt: Di sản và ký ức cộng đồng.",
  "English: Supporting research remains version-specific.",
  "漢文: 學而時習之",
  "中文: 社区记忆与地方知识",
  "日本語: 資料の来歴を確認する",
  "한국어: 연구 자료의 출처",
  "Français: mémoire collective et patrimoine",
  "العربية: الذاكرة المجتمعية وسياق البحث",
  "Supplementary-plane probe: 𠀀",
];

export function FoundationShowcase() {
  const [locale, setLocale] = useState<UiLocale>("vi");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  useEffect(() => {
    const initialTheme = document.documentElement.dataset.theme;
    return () => {
      if (initialTheme) document.documentElement.dataset.theme = initialTheme;
      else delete document.documentElement.dataset.theme;
    };
  }, []);

  function setTheme(theme: "light" | "dark") {
    document.documentElement.dataset.theme = theme;
  }

  return (
    <>
      <SkipLink href="#ui-next-preview-main">{t("preview.skip")}</SkipLink>
      <main id="ui-next-preview-main" className="ui-next-preview" tabIndex={-1}>
        <PageContainer width="wide">
          <Stack>
            <PageHeader
              title={t("preview.title")}
              description={t("preview.description")}
              actions={<Button variant="primary">{t("common.create")}</Button>}
            />

            <section className="ui-next-preview__section" aria-labelledby="preview-controls">
              <h2 id="preview-controls">{t("preview.controls")}</h2>
              <Surface>
                <div className="ui-next-preview__grid">
                  <Select
                    id="preview-locale"
                    label={t("preview.locale")}
                    value={locale}
                    onChange={(event) => setLocale(event.target.value as UiLocale)}
                  >
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                  </Select>
                  <div className="ui-next-field">
                    <span className="ui-next-field__label">{t("preview.theme")}</span>
                    <Inline>
                      <Button type="button" onClick={() => setTheme("light")}>
                        {t("preview.light")}
                      </Button>
                      <Button type="button" onClick={() => setTheme("dark")}>
                        {t("preview.dark")}
                      </Button>
                    </Inline>
                  </div>
                </div>
              </Surface>
            </section>

            <section className="ui-next-preview__section" aria-labelledby="preview-components">
              <h2 id="preview-components">{t("preview.components")}</h2>
              <Surface className="ui-next-stack">
                <Inline>
                  <Button variant="primary">{t("common.save")}</Button>
                  <Button variant="secondary">{t("common.cancel")}</Button>
                  <Button variant="ghost">{t("nav.search")}</Button>
                  <Button variant="danger">{t("status.failed")}</Button>
                  <Button loading loadingLabel={t("common.loading")}>
                    {t("status.saving")}
                  </Button>
                </Inline>
                <Inline>
                  <StatusBadge>{t("status.unsaved")}</StatusBadge>
                  <StatusBadge tone="success">{t("status.saved")}</StatusBadge>
                  <StatusBadge tone="warning">{t("status.conflict")}</StatusBadge>
                  <StatusBadge tone="danger">{t("status.failed")}</StatusBadge>
                  <StatusBadge tone="information">{t("status.processing")}</StatusBadge>
                  <SaveStatus state="saving" label={t("status.saving")} />
                </Inline>
                <div className="ui-next-preview__grid">
                  <TextField
                    id="preview-title"
                    label={t("preview.formTitle")}
                    description={t("preview.formDescription")}
                    placeholder="Huế, 1972"
                  />
                  <TextArea
                    id="preview-notes"
                    label={t("project.notes")}
                    defaultValue="Arbitrary Unicode remains unchanged: 𠀀 — العربية — 漢文"
                  />
                </div>
                <Progress label={t("status.processing")} value={62} />
                <Skeleton label={t("common.loading")} />
                <Inline>
                  <Button type="button" onClick={() => setDialogOpen(true)}>
                    {t("preview.openDialog")}
                  </Button>
                  <Button type="button" onClick={() => setDrawerOpen(true)}>
                    {t("preview.openDrawer")}
                  </Button>
                </Inline>
                <div className="ui-next-preview__grid">
                  <EmptyState
                    title={t("preview.emptyTitle")}
                    description={t("preview.emptyDescription")}
                    action={<Button>{t("common.create")}</Button>}
                  />
                  <ErrorState
                    title={t("preview.errorTitle")}
                    description={t("preview.errorDescription")}
                    action={<Button>{t("common.tryAgain")}</Button>}
                  />
                </div>
              </Surface>
            </section>

            <section className="ui-next-preview__section" aria-labelledby="preview-research">
              <h2 id="preview-research">{t("preview.research")}</h2>
              <Surface>
                <ResearchContent>
                  <h2>Multilingual research probe</h2>
                  {multilingualSamples.map((sample) => (
                    <p key={sample}>{sample}</p>
                  ))}
                  <blockquote>
                    Project ownership, privacy, and publication remain separate dimensions.
                  </blockquote>
                  <p className="ui-next-preview__rtl">العربية: هذا النص يختبر اتجاه المحتوى فقط.</p>
                  <pre>
                    <code>{`const lineage = "SourceVersion → NoteVersion";`}</code>
                  </pre>
                  <table>
                    <thead>
                      <tr>
                        <th>Language</th>
                        <th>Sample</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Vietnamese</td>
                        <td>Kiến trúc Huế</td>
                      </tr>
                      <tr>
                        <td>Japanese</td>
                        <td>資料の来歴</td>
                      </tr>
                    </tbody>
                  </table>
                </ResearchContent>
              </Surface>
            </section>
          </Stack>
        </PageContainer>
      </main>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={t("preview.dialogTitle")}
        description={t("preview.dialogDescription")}
        closeLabel={t("common.close")}
      >
        <p>{t("preview.dialogDescription")}</p>
      </Dialog>
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={t("preview.drawerTitle")}
        description={t("preview.drawerDescription")}
        closeLabel={t("common.close")}
      >
        <p>{t("preview.drawerDescription")}</p>
      </Drawer>
    </>
  );
}
