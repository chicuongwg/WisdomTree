import type { UiNextMessageKey } from "../localization";

export type ApplicationErrorClass =
  | "not_found"
  | "forbidden"
  | "invalid_input"
  | "version_conflict"
  | "invalid_state"
  | "internal_error";

const errorCopy: Record<
  ApplicationErrorClass,
  { titleKey: UiNextMessageKey; descriptionKey: UiNextMessageKey }
> = {
  not_found: { titleKey: "error.notFound.title", descriptionKey: "error.notFound.description" },
  forbidden: { titleKey: "error.forbidden.title", descriptionKey: "error.forbidden.description" },
  invalid_input: {
    titleKey: "error.invalidInput.title",
    descriptionKey: "error.invalidInput.description",
  },
  version_conflict: {
    titleKey: "error.versionConflict.title",
    descriptionKey: "error.versionConflict.description",
  },
  invalid_state: {
    titleKey: "error.invalidState.title",
    descriptionKey: "error.invalidState.description",
  },
  internal_error: {
    titleKey: "error.internal.title",
    descriptionKey: "error.internal.description",
  },
};

export function getErrorPresentation(errorClass: ApplicationErrorClass) {
  return errorCopy[errorClass];
}
