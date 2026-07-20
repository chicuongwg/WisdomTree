"use client";

// The root layout queries the database (layout.tsx: currentUser, sidebar
// outline, unread count), so a database outage throws *in the layout itself* —
// above where an `error.tsx` boundary can catch it. Only global-error.tsx
// covers that, and because it replaces the whole document it has to render its
// own <html> and <body>, and cannot use anything from the layout: no shell, no
// theme script, no globals.css. Hence the inline styles.
// The hex values are the palette's own, copied because they cannot be read:
// paper #f2f4ee on ink #232b26, canopy green #1e6b4a for the one button, and
// the --font-ui stack. The dark set is the data-theme="dark" block; the theme
// script cannot run here either, so the OS preference stands in for it, and
// !important is what beats the inline styles below.
const darkTheme = `@media (prefers-color-scheme: dark){
  body{background:#171d1a!important;color:#dbe3dc!important}
  button{background:#4ea87c!important;border-color:#4ea87c!important;color:#121714!important}
}`;

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          background: "#f2f4ee",
          color: "#232b26",
          fontFamily: 'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: darkTheme }} />
        <main style={{ maxWidth: "32rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>Hệ thống đang gián đoạn</h1>
          <p style={{ lineHeight: 1.6, marginBottom: "1.5rem" }}>
            Không tải được trang này. Dữ liệu của bạn vẫn an toàn — chưa có thay đổi nào bị mất.
            Vui lòng thử lại sau ít phút, hoặc báo quản trị viên nếu tình trạng kéo dài.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              font: "inherit",
              minHeight: "44px",
              padding: "0.6rem 1.4rem",
              borderRadius: "0.4rem",
              border: "1px solid #1e6b4a",
              background: "#1e6b4a",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            Thử lại
          </button>
        </main>
      </body>
    </html>
  );
}
