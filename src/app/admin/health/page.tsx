import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, toPrincipal } from "@/lib/page";
import { T, when, exportJobStateLabel } from "@/lib/vi";
import { databaseReachable, healthReport } from "@/modules/export/service";
import { listReviewQueue } from "@/modules/storage/curation";

// Screen: System Health (`/admin/health`) — the health section lifted off the
// Admin Console onto a page of its own, laid out as a dashboard.
//
// The owner runs Prometheus/Grafana/Loki beside this app, so the background
// job counts that used to sit here are gone: a metrics stack reads them
// better, and repeating them here only invited two answers to one question.
// What is left is what an app can say about ITSELF and a scraper cannot —
// does the database answer, did the last export land, is anything waiting or
// overdue, which components are running degraded, how long the server has
// been up.
//
// ponytail: no history, no sparklines, no auto-refresh. The page is read when
// something feels wrong; a reload is the refresh. Add a trend when someone
// asks "since when", which is the question a graph answers and a number does not.

type Tone = "ok" | "warn";

/** One reading on the board: a label, the number or word, and why it matters. */
function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
  tone?: Tone;
}) {
  return (
    <section className="panel health-card">
      <h2 className="health-label">{label}</h2>
      <p className={tone ? `health-value tone-${tone}` : "health-value"}>{value}</p>
      <p className="muted health-hint">{hint}</p>
    </section>
  );
}

/**
 * A degraded component, said in Vietnamese. The service writes these for an
 * operator ("pandoc (document render runs the HTML stub)"); the reader of this
 * page needs the consequence, not the component's name in English. An entry
 * this list has not caught up with is shown as the service wrote it — a
 * component silently missing from the screen would be the worse failure.
 */
function degradedWords(component: string): string {
  if (component.startsWith("pandoc")) return T.healthPandocMissing;
  if (component.startsWith("pdf-engine")) return T.healthPdfEngineMissing;
  return component;
}

/** Uptime in words. Whole hours and days: nobody reads a server age in seconds. */
function uptimeWords(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (days > 0) return `${days} ngày ${hours} giờ`;
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  return `${minutes} phút`;
}

export default async function HealthPage() {
  const user = await requireUser();
  if (user.role !== "admin_op") notFound();

  const actor = toPrincipal(user);
  const [health, dbOk, reviewQueue] = await Promise.all([
    healthReport(actor),
    databaseReachable(),
    listReviewQueue(actor, {}),
  ]);

  const waiting = reviewQueue.filter((t) =>
    ["queued", "assigned", "in_review", "changes_requested"].includes(t.state),
  ).length;

  // The banner is a summary of the readings below it, not a separate fact: if
  // anything on this page is asking for a person, say so at the top rather
  // than making the reader scan eight cards to find out.
  const attention =
    !dbOk ||
    health.degradedComponents.length > 0 ||
    health.overdueLoanCount > 0 ||
    health.lastExport?.state === "failed";

  return (
    <main className="page">
      <h1>{T.healthPageTitle}</h1>
      <p className="muted">{T.healthPageIntro}</p>
      <p>
        <Link href="/admin">{T.healthBackToAdmin}</Link>
      </p>

      <p>
        <span className={attention ? "badge tone-attention" : "badge tone-done"}>
          {attention ? T.healthNeedsAttention : T.healthAllWell}
        </span>{" "}
        <span className="muted">
          {T.healthCheckedAt} {when(new Date())}
        </span>
      </p>

      <div className="health-grid">
        <Metric
          label={T.healthDatabase}
          value={dbOk ? T.healthDbOk : T.healthDbDown}
          hint={T.healthDatabaseHint}
          tone={dbOk ? "ok" : "warn"}
        />
        <Metric
          label={T.healthDegraded}
          value={
            health.degradedComponents.length === 0 ? (
              T.healthNone
            ) : (
              <>
                {health.degradedComponents.map((c) => (
                  <span key={c} className="health-line">
                    {degradedWords(c)}
                  </span>
                ))}
              </>
            )
          }
          hint={T.healthDegradedHint}
          tone={health.degradedComponents.length === 0 ? "ok" : "warn"}
        />
        <Metric
          label={T.healthLastExport}
          value={
            health.lastExport ? (
              <>
                {exportJobStateLabel(health.lastExport.state)}
                <span className="health-line muted">{when(health.lastExport.updatedAt)}</span>
              </>
            ) : (
              T.healthNoExport
            )
          }
          hint={T.healthLastExportHint}
          tone={health.lastExport?.state === "failed" ? "warn" : undefined}
        />
        <Metric
          label={T.healthReviewWaiting}
          value={waiting}
          hint={T.healthReviewWaitingHint}
          // No tone: a queue with work in it is the normal state of a review
          // queue, and amber on a normal state teaches readers to ignore amber.
        />
        <Metric
          label={T.healthOverdueLoans}
          value={health.overdueLoanCount}
          hint={T.healthOverdueLoansHint}
          tone={health.overdueLoanCount > 0 ? "warn" : "ok"}
        />
        <Metric
          label={T.healthOutbox}
          value={health.outboxUndispatchedCount}
          hint={T.healthOutboxHint}
          tone={health.outboxUndispatchedCount > 0 ? "warn" : "ok"}
        />
        <Metric
          label={T.healthBackup}
          value={
            health.backupStatus === "not_configured"
              ? T.healthBackupNotConfigured
              : when(health.lastBackupAt)
          }
          hint={T.healthBackupHint}
          tone={health.backupStatus === "not_configured" ? "warn" : "ok"}
        />
        {/* Uptime comes from the process itself, so it costs nothing and needs
            no module read of its own — and it is the one number that says
            "the server restarted" when everything else looks fine. */}
        <Metric
          label={T.healthUptime}
          value={uptimeWords(process.uptime())}
          hint={T.healthUptimeHint}
        />
      </div>
    </main>
  );
}
