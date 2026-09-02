const NOTE_NAVIGATION_REQUEST = "wisdomtree:note-navigation-request";

type NavigationEventTarget = Pick<
  EventTarget,
  "addEventListener" | "removeEventListener" | "dispatchEvent"
>;

export function registerUnsavedNoteNavigationGuard(
  target: NavigationEventTarget,
  hasUnpersistedWork: () => boolean,
  confirmNavigation: () => boolean,
) {
  const handleNavigationRequest = (event: Event) => {
    if (hasUnpersistedWork() && !confirmNavigation()) {
      event.preventDefault();
    }
  };
  target.addEventListener(NOTE_NAVIGATION_REQUEST, handleNavigationRequest);
  return () => target.removeEventListener(NOTE_NAVIGATION_REQUEST, handleNavigationRequest);
}

export function requestUnsavedNoteNavigation(target: EventTarget = window) {
  return target.dispatchEvent(new Event(NOTE_NAVIGATION_REQUEST, { cancelable: true }));
}

export function runGuardedNoteNavigation(navigate: () => void, target?: EventTarget) {
  if (!requestUnsavedNoteNavigation(target)) return false;
  navigate();
  return true;
}

export function shouldGuardNoteAnchorNavigation(input: {
  button: number;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  target: string | null;
  download: boolean;
  href: string;
  currentHref: string;
}) {
  if (
    input.button !== 0 ||
    input.altKey ||
    input.ctrlKey ||
    input.metaKey ||
    input.shiftKey ||
    input.download ||
    (input.target !== null && input.target !== "" && input.target !== "_self")
  ) {
    return false;
  }
  try {
    const current = new URL(input.currentHref);
    const destination = new URL(input.href, current);
    return destination.pathname !== current.pathname || destination.search !== current.search;
  } catch {
    return false;
  }
}
