import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./foundation.css";
import { ValidationMessages } from "./components/validation-messages";

export const metadata: Metadata = {
  // A template, so every screen's own title reads "<screen> · WisdomTree" and
  // the bare app name is left for the home page. Before this the layout held
  // the ONLY metadata in the app: every tab, every bookmark and every entry in
  // a reader's history said "WisdomTree" and nothing else, which makes the
  // browser's own back list — the one navigation aid no app can replace —
  // useless.
  title: { default: "WisdomTree", template: "%s · WisdomTree" },
  description: "Nền tảng lưu trữ và tri thức của nhóm",
};

export const dynamic = "force-dynamic";

// Stamps the persisted (or OS-preferred) theme on <html> before first paint
// so the dark theme never flashes light. The side panel rides along for the
// same reason: the rail reads the key in an effect, and without this the panel
// would appear and then fold away on every full page load.
const themeScript = `try{var t=localStorage.getItem("wt-theme");if(!t&&matchMedia("(prefers-color-scheme: dark)").matches)t="dark";if(t)document.documentElement.dataset.theme=t;var s=localStorage.getItem("wisdomtree.sidebar");if(s)document.documentElement.dataset.sidebar=s;}catch(e){}`;

// The body face on every page; preloading the regular weight saves the
// discover-via-CSS round trip on first paint (React hoists <link> to <head>).
const fontPreload = (
  <link
    rel="preload"
    href="/fonts/cda-independence-text-regular.otf"
    as="font"
    type="font/otf"
    crossOrigin="anonymous"
  />
);

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {fontPreload}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ValidationMessages />
        {children}
      </body>
    </html>
  );
}
