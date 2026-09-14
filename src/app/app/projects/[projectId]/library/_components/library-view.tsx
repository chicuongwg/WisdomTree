"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import {
  Button,
  EmptyState,
  StatusBadge,
  formatUiDate,
  translate,
  type StatusTone,
} from "@/app/components/ui-next";

type Holding = {
  sourceId: string;
  title: string;
  description: string | null;
  itemCode: string;
  author: string | null;
  location: string | null;
  copies: number;
  status: "available" | "borrowed" | "lost" | "repair";
  activeLoans: number;
  availableCopies: number;
  hasMyActiveLoan: boolean;
};

type Loan = {
  id: string;
  materialId: string;
  materialTitle: string;
  itemCode: string;
  borrowerName: string;
  state: "requested" | "approved" | "borrowed" | "overdue" | "returned" | "declined";
  requestedAt: Date | string;
  dueAt: Date | string | null;
};

type LibraryDto = {
  holdings: Holding[];
  loans: Loan[];
  capabilities: { canRequestLoan: boolean; canManageLoans: boolean };
};

const holdingTones: Record<Holding["status"], StatusTone> = {
  available: "success",
  borrowed: "warning",
  lost: "danger",
  repair: "warning",
};

const loanTones: Record<Loan["state"], StatusTone> = {
  requested: "information",
  approved: "information",
  borrowed: "warning",
  overdue: "danger",
  returned: "success",
  declined: "neutral",
};

export function LibraryView({
  projectId,
  locale,
  library,
}: {
  projectId: string;
  locale: UiLocale;
  library: LibraryDto;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(library.holdings[0]?.sourceId ?? "");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dueDates, setDueDates] = useState<Record<string, string>>({});
  const selected = useMemo(
    () => library.holdings.find((item) => item.sourceId === selectedId) ?? null,
    [library.holdings, selectedId],
  );

  async function requestLoan(materialId: string) {
    setPendingId(`request:${materialId}`);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/app/projects/${encodeURIComponent(projectId)}/library/${encodeURIComponent(materialId)}/loan`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("request_failed");
      setMessage(translate(locale, "library.requestedLoan"));
      router.refresh();
    } catch {
      setMessage(translate(locale, "library.requestFailed"));
    } finally {
      setPendingId(null);
    }
  }

  async function transition(loan: Loan, action: "approve" | "decline" | "handover" | "return") {
    setPendingId(loan.id);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/app/projects/${encodeURIComponent(projectId)}/library/loans/${encodeURIComponent(loan.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            ...(action === "handover" ? { dueAt: dueDates[loan.id] } : {}),
          }),
        },
      );
      if (!response.ok) throw new Error("transition_failed");
      router.refresh();
    } catch {
      setMessage(translate(locale, "library.transitionFailed"));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="ui-next-library grid gap-6" aria-labelledby="library-title">
      <header className="ui-next-library__header">
        <div>
          <h2 id="library-title" className="m-0 text-lg font-bold">
            {translate(locale, "library.title")}
          </h2>
          <p className="m-0 mt-2 text-ui-text-secondary">
            {translate(locale, "library.description")}
          </p>
        </div>
      </header>

      {message ? (
        <p
          className="ui-next-library__message p-3 rounded bg-ui-information-bg text-ui-information"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <section aria-labelledby="library-holdings-title" className="grid gap-3">
        <h3 id="library-holdings-title" className="m-0 text-base font-semibold">
          {translate(locale, "library.holdings")}
        </h3>
        {library.holdings.length === 0 ? (
          <EmptyState title={translate(locale, "library.empty")} />
        ) : (
          <div className="ui-next-library__layout grid grid-cols-[minmax(16rem,0.9fr)_minmax(0,1.1fr)] max-md:grid-cols-1 gap-4 mt-3">
            <ul className="ui-next-library__holdings grid gap-0 list-none m-0 p-0 divide-y divide-ui-border border border-ui-border rounded-lg overflow-hidden">
              {library.holdings.map((item) => (
                <li key={item.sourceId}>
                  <button
                    type="button"
                    className="ui-next-library__holding w-full flex items-center max-md:items-start justify-between gap-3 p-4 bg-ui-surface text-start cursor-pointer hover:bg-ui-surface-sunken aria-pressed:border-ui-accent aria-pressed:bg-ui-surface-sunken"
                    aria-pressed={item.sourceId === selected?.sourceId}
                    onClick={() => setSelectedId(item.sourceId)}
                  >
                    <span className="min-w-0 grid gap-1 break-words">
                      <strong className="text-sm font-semibold text-ui-text">{item.title}</strong>
                      <small className="text-xs text-ui-text-secondary">{item.itemCode}</small>
                    </span>
                    <StatusBadge tone={holdingTones[item.status]}>
                      {translate(locale, "library.availableCopies")}: {item.availableCopies}/
                      {item.copies}
                    </StatusBadge>
                  </button>
                </li>
              ))}
            </ul>

            {selected ? (
              <article
                className="ui-next-library__detail grid content-start gap-3 p-6 border border-ui-border rounded-lg bg-ui-surface"
                aria-labelledby="library-detail-title"
              >
                <h3 id="library-detail-title" className="m-0 text-base font-semibold">
                  {translate(locale, "library.details")}
                </h3>
                <h4 className="m-0 text-lg font-bold">{selected.title}</h4>
                {selected.description ? (
                  <p className="m-0 mt-2 text-ui-text-secondary">{selected.description}</p>
                ) : null}
                <dl className="grid grid-cols-2 gap-3 m-0">
                  <div>
                    <dt className="text-sm text-ui-text-secondary">
                      {translate(locale, "library.itemCode")}
                    </dt>
                    <dd className="m-0 mt-1 font-semibold">{selected.itemCode}</dd>
                  </div>
                  {selected.author ? (
                    <div>
                      <dt className="text-sm text-ui-text-secondary">
                        {translate(locale, "library.author")}
                      </dt>
                      <dd className="m-0 mt-1 font-semibold">{selected.author}</dd>
                    </div>
                  ) : null}
                  {selected.location ? (
                    <div>
                      <dt className="text-sm text-ui-text-secondary">
                        {translate(locale, "library.location")}
                      </dt>
                      <dd className="m-0 mt-1 font-semibold">{selected.location}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-sm text-ui-text-secondary">
                      {translate(locale, "library.copies")}
                    </dt>
                    <dd className="m-0 mt-1 font-semibold">{selected.copies}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-ui-text-secondary">
                      {translate(locale, "library.availableCopies")}
                    </dt>
                    <dd className="m-0 mt-1 font-semibold">{selected.availableCopies}</dd>
                  </div>
                </dl>
                <div className="ui-next-library__detail-actions flex flex-wrap items-end gap-2 pt-2">
                  <Link
                    href={`/app/projects/${encodeURIComponent(projectId)}/materials/${encodeURIComponent(selected.sourceId)}`}
                    className="text-ui-accent font-semibold underline-offset-[0.18em] hover:underline"
                  >
                    {translate(locale, "library.material")}
                  </Link>
                  {library.capabilities.canRequestLoan ? (
                    <Button
                      type="button"
                      variant="primary"
                      disabled={selected.availableCopies === 0 || selected.hasMyActiveLoan}
                      loading={pendingId === `request:${selected.sourceId}`}
                      loadingLabel={translate(locale, "library.requestingLoan")}
                      onClick={() => requestLoan(selected.sourceId)}
                    >
                      {selected.availableCopies === 0 || selected.hasMyActiveLoan
                        ? translate(locale, "library.unavailable")
                        : translate(locale, "library.requestLoan")}
                    </Button>
                  ) : null}
                </div>
              </article>
            ) : null}
          </div>
        )}
      </section>

      {library.capabilities.canManageLoans ? (
        <section
          className="ui-next-library__loans grid gap-3"
          aria-labelledby="library-loans-title"
        >
          <h3 id="library-loans-title" className="m-0 text-base font-semibold">
            {translate(locale, "library.loanQueue")}
          </h3>
          {library.loans.length === 0 ? (
            <p className="m-0 text-ui-text-secondary">{translate(locale, "library.noLoans")}</p>
          ) : (
            <ul className="grid gap-0 list-none m-0 p-0 divide-y divide-ui-border border border-ui-border rounded-lg overflow-hidden">
              {library.loans.map((loan) => (
                <li
                  key={loan.id}
                  className="flex items-center max-md:flex-col justify-between gap-4 p-4 bg-ui-surface"
                >
                  <div className="min-w-0 grid gap-1">
                    <strong className="text-ui-text break-words font-semibold">
                      {loan.materialTitle}
                    </strong>
                    <span className="text-xs text-ui-text-secondary">
                      {loan.itemCode} · {translate(locale, "library.borrower")}: {loan.borrowerName}
                    </span>
                    <span className="text-xs text-ui-text-secondary">
                      {translate(locale, "library.requestedAt")}:{" "}
                      {formatUiDate(loan.requestedAt, locale)}
                    </span>
                    {loan.dueAt ? (
                      <span className="text-xs text-ui-text-secondary">
                        {translate(locale, "library.dueAt")}: {formatUiDate(loan.dueAt, locale)}
                      </span>
                    ) : null}
                  </div>
                  <div className="ui-next-library__loan-actions flex flex-wrap items-end gap-2 shrink-0">
                    <StatusBadge tone={loanTones[loan.state]}>
                      {translate(locale, `library.loan.${loan.state}`)}
                    </StatusBadge>
                    {loan.state === "requested" ? (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          loading={pendingId === loan.id}
                          loadingLabel={translate(locale, "library.action.updating")}
                          onClick={() => transition(loan, "approve")}
                        >
                          {translate(locale, "library.action.approve")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={pendingId === loan.id}
                          onClick={() => transition(loan, "decline")}
                        >
                          {translate(locale, "library.action.decline")}
                        </Button>
                      </>
                    ) : null}
                    {loan.state === "approved" ? (
                      <>
                        <label className="ui-next-library__due-date grid gap-1 text-ui-text-secondary text-sm font-semibold">
                          <span>{translate(locale, "library.dueAt")}</span>
                          <input
                            type="date"
                            className="min-h-[2.5rem] border border-ui-border-strong rounded px-2 bg-ui-surface text-ui-text font-inherit"
                            value={dueDates[loan.id] ?? ""}
                            onChange={(event) =>
                              setDueDates((current) => ({
                                ...current,
                                [loan.id]: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <Button
                          type="button"
                          variant="primary"
                          loading={pendingId === loan.id}
                          loadingLabel={translate(locale, "library.action.updating")}
                          onClick={() => transition(loan, "handover")}
                        >
                          {translate(locale, "library.action.handover")}
                        </Button>
                      </>
                    ) : null}
                    {loan.state === "borrowed" || loan.state === "overdue" ? (
                      <Button
                        type="button"
                        variant="primary"
                        loading={pendingId === loan.id}
                        loadingLabel={translate(locale, "library.action.updating")}
                        onClick={() => transition(loan, "return")}
                      >
                        {translate(locale, "library.action.return")}
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </section>
  );
}
