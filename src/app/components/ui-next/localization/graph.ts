import type { UiLocale } from "@/modules/auth/profile";
import { T } from "@/lib/vi";
import { translate } from "./index";

const graphKeys = [
  "legend",
  "loading",
  "graph",
  "graphEmpty",
  "graphNoMatch",
  "graphZoomGroup",
  "graphZoomIn",
  "graphZoomOut",
  "graphZoomReset",
  "graphPinnedOne",
  "graphUnpinned",
  "graphContextOpen",
  "graphContextLocal",
  "graphContextPin",
  "graphContextUnpin",
  "graphKeyboardHelp",
  "graphTouchHelp",
  "graphMotionOff",
  "graphSettings",
  "graphResetSettings",
  "graphClosePanel",
  "graphPanelFilters",
  "graphPanelDisplay",
  "graphPanelForces",
  "filterByTitle",
  "filterByTag",
  "allTags",
  "graphLocalDepth",
  "graphShowOrphans",
  "graphLinkTypes",
  "graphArrows",
  "graphTextFade",
  "graphTextFadeHelp",
  "graphNodeSize",
  "graphLinkThickness",
  "graphReplay",
  "graphCentreForce",
  "graphRepelForce",
  "graphLinkForce",
  "graphLinkDistance",
] as const;

// Retain legacy copy for retained wiki-only controls; research-map copy uses
// the same locale catalog as its surrounding workspace.
export function getGraphCopy(locale: UiLocale) {
  const messages = Object.fromEntries(
    graphKeys.map((key) => [key, translate(locale, `graph.${key}`)]),
  ) as Record<(typeof graphKeys)[number], string>;
  return {
    ...T,
    ...messages,
    node: translate(locale, "graph.records"),
    graphHelp: (key: string) => translate(locale, "graph.graphHelp", { key }),
  };
}
