"use client";

// The root layout queries the database (layout.tsx: currentUser, sidebar
// outline, unread count), so a database outage throws *in the layout itself* —
// above where an `error.tsx` boundary can catch it. Only global-error.tsx
// covers that, and because it replaces the whole document it has to render its
// own <html> and <body>, and cannot use anything from the layout: no shell, no
// theme script, no globals.css. Hence the inline styles.
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
          background: "#faf7f2",
          color: "#2b2724",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
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
              padding: "0.6rem 1.4rem",
              borderRadius: "0.4rem",
              border: "1px solid #3f4a86",
              background: "#3f4a86",
              color: "#fff",
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
