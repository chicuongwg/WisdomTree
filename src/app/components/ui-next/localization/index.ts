import type { UiLocale } from "@/modules/auth/profile";
import { APP_TZ } from "@/lib/time";
import { enMessages } from "./locales/en";
import { viMessages } from "./locales/vi";

export type UiNextMessageKey = keyof typeof viMessages;
export type MessageValues = Record<string, string | number>;

const catalogs: Record<UiLocale, Record<UiNextMessageKey, string>> = {
  vi: viMessages,
  en: enMessages,
};

export const UI_NEXT_LOCALES = ["vi", "en"] as const satisfies readonly UiLocale[];

export function interpolateMessage(template: string, values: MessageValues = {}): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}

export function translate(
  locale: UiLocale | string | null | undefined,
  key: UiNextMessageKey,
  values?: MessageValues,
): string {
  const normalized: UiLocale = locale === "en" ? "en" : "vi";
  const message = catalogs[normalized][key] ?? viMessages[key];

  if (!message) {
    return process.env.NODE_ENV === "development" ? `[missing:${key}]` : key;
  }

  return interpolateMessage(message, values);
}

const localeTags: Record<UiLocale, string> = { vi: "vi-VN", en: "en-US" };

export function formatUiDate(
  value: Date | number | string,
  locale: UiLocale,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  return new Intl.DateTimeFormat(localeTags[locale], { timeZone: APP_TZ, ...options }).format(
    new Date(value),
  );
}

export function formatUiNumber(
  value: number,
  locale: UiLocale,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(localeTags[locale], options).format(value);
}

export { enMessages, viMessages };
