"use client";

import { useEffect } from "react";
import { T } from "@/lib/vi";

/**
 * The browser's validation bubbles, in Vietnamese.
 *
 * Twenty fields in this app carry `required`, `min` or a `type` the browser
 * checks, and every one of them refused in the BROWSER's language — "Please
 * fill out this field." on a screen that is Vietnamese from the rail to the
 * status strip. `<html lang="vi">` does not change that: the bubble follows
 * the browser's own UI language, not the document's.
 *
 * One listener rather than twenty props. `invalid` does not bubble, so it is
 * caught in the capture phase at the document, which means a field added
 * tomorrow is covered without anyone remembering this file exists. The message
 * is cleared on the next input, or the field would stay invalid forever with a
 * sentence it has already answered.
 *
 * ponytail: this replaces the bubble's WORDS, not the bubble. A custom popover
 * would mean positioning, dismissal and focus handling for something the
 * platform already does correctly in every browser the team uses.
 */
function messageFor(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
  const v = el.validity;
  if (v.valueMissing) return T.validationRequired;
  if (v.typeMismatch || v.badInput) return T.validationBadFormat;
  if (v.rangeUnderflow) return T.validationMin((el as HTMLInputElement).min);
  if (v.rangeOverflow) return T.validationMax((el as HTMLInputElement).max);
  if (v.tooShort || v.tooLong) return T.validationLength;
  if (v.patternMismatch) return T.validationBadFormat;
  return T.validationGeneric;
}

const isField = (t: EventTarget | null): t is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
  t instanceof HTMLInputElement || t instanceof HTMLSelectElement || t instanceof HTMLTextAreaElement;

export function ValidationMessages() {
  useEffect(() => {
    const onInvalid = (e: Event) => {
      if (!isField(e.target)) return;
      // Clear first: a message left over from the previous attempt makes the
      // field permanently invalid, so the browser would never re-check it.
      e.target.setCustomValidity("");
      if (!e.target.checkValidity()) e.target.setCustomValidity(messageFor(e.target));
    };
    const onInput = (e: Event) => {
      if (isField(e.target)) e.target.setCustomValidity("");
    };
    document.addEventListener("invalid", onInvalid, true);
    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onInput, true);
    return () => {
      document.removeEventListener("invalid", onInvalid, true);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onInput, true);
    };
  }, []);
  return null;
}
