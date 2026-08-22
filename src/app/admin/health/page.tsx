import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, toPrincipal } from "@/lib/page";
import { T, when } from "@/lib/vi";
import { databaseReachable, healthReport } from "@/modules/export/service";
import { listPendingProposals } from "@/modules/knowledge/service";

export const metadata = { title: T.healthPageTitle };

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

type Tone = "done" | "attention";

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
      <p className="meta health-hint">{hint}</p>
    </section>
  );
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
  const [health, dbOk, pendingProposals] = await Promise.all([
    healthReport(actor),
    databaseReachable(),
    listPendingProposals(actor),
  ]);

  const waiting = pendingProposals.publications.length + pendingProposals.changes.length;

  // The banner is a summary of the readings below it, not a separate fact: if
  // anything on this page is asking for a person, say so at the top rather
  // than making the reader scan eight cards to find out.
  const attention = !dbOk || health.overdueLoanCount > 0;

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
        {/* The moment the readings were TAKEN, handed over by the service.
            This printed `new Date()` — the moment the page happened to render
            — so a cached or slow render dated the numbers to now regardless of
            how old they were, which is the one thing a health board must not
            get wrong. */}
        <span className="muted">
          {T.healthCheckedAt} {when(health.checkedAt)}
        </span>
      </p>

      <div className="health-grid">
        <Metric
          label={T.healthDatabase}
          value={dbOk ? T.healthDbOk : T.healthDbDown}
          hint={T.healthDatabaseHint}
          tone={dbOk ? "done" : "attention"}
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
          tone={health.overdueLoanCount > 0 ? "attention" : "done"}
        />
        <Metric
          label={T.healthOutbox}
          value={health.outboxUndispatchedCount}
          hint={T.healthOutboxHint}
          tone={health.outboxUndispatchedCount > 0 ? "attention" : "done"}
        />
        <Metric
          label={T.healthBackup}
          value={
            health.backupStatus === "not_configured"
              ? T.healthBackupNotConfigured
              : when(health.lastBackupAt)
          }
          hint={T.healthBackupHint}
          tone={health.backupStatus === "not_configured" ? "attention" : "done"}
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
