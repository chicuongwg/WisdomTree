"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import {
  Button,
  Dialog,
  Select,
  Surface,
  TextArea,
  TextField,
  translate,
  formatUiDate,
} from "@/app/components/ui-next";
import type { UiNextMessageKey } from "@/app/components/ui-next/localization";

const auditLabels: Record<string, UiNextMessageKey> = {
  "user.locale.update": "admin.audit.locale",
  "activity.create": "admin.audit.activity",
  "source.upload": "admin.audit.upload",
  "node.draft.publish": "admin.audit.saveNote",
  "branch.create": "admin.audit.branch",
  "node.draft.create": "admin.audit.draft",
  "project.create": "admin.audit.project",
  "person.create": "admin.audit.person",
  "task.create": "admin.audit.task",
  "user.invite": "admin.audit.invite",
  "user.role.change": "admin.audit.role",
  "tmkt.core.grant": "admin.audit.grantCore",
  "tmkt.core.revoke": "admin.audit.revokeCore",
  "note.public.publish": "admin.audit.publish",
  "note.public.unpublish": "admin.audit.unpublish",
};

type Project = {
  id: string;
  name: string;
  researchLens: string;
  status: "active" | "paused" | "completed" | "archived";
  features: { libraryCirculation: boolean };
};
type User = {
  id: string;
  email: string;
  displayName: string;
  role: "user" | "editor" | "admin_op";
  disabledAt: Date | string | null;
  invited: boolean;
};
type CoreMember = { userId: string; displayName: string; email: string; role: string };
type AuditEvent = {
  id: bigint;
  action: string;
  actorName: string | null;
  createdAt: Date | string;
};
type OperationalStatus = {
  checkedAt: Date | string;
  overdueLoanCount: number;
  lastBackupAt: Date | string | null;
  backupStatus: string;
};

async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error("request_failed");
}

export function AdminWorkspace({
  locale,
  projects,
  users,
  coreMembers,
  auditEvents,
  operationalStatus,
}: {
  locale: UiLocale;
  projects: Project[];
  users: User[];
  coreMembers: CoreMember[];
  auditEvents: AuditEvent[];
  operationalStatus: OperationalStatus;
}) {
  const router = useRouter();
  const [activeForm, setActiveForm] = useState<"project" | "user" | "core" | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run(operation: () => Promise<void>) {
    setPending(true);
    setMessage(null);
    try {
      await operation();
      router.refresh();
    } catch {
      setMessage(translate(locale, "admin.actionFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="ui-next-governance ui-next-governance--admin grid grid-cols-1 lg:grid-cols-2 gap-6 items-start w-full max-w-[90rem]">
      <Surface className="ui-next-governance__section grid gap-4 content-start">
        <div className="ui-next-governance__heading flex items-center justify-between flex-wrap gap-3">
          <h2 className="m-0 text-lg font-bold">{translate(locale, "admin.projects")}</h2>
          <Button
            type="button"
            onClick={() => {
              setMessage(null);
              setActiveForm("project");
            }}
          >
            {translate(locale, "admin.createProject")}
          </Button>
        </div>
        <Dialog
          open={activeForm === "project"}
          onClose={() => {
            if (!pending) setActiveForm(null);
          }}
          title={translate(locale, "admin.createProject")}
          closeLabel={translate(locale, "common.close")}
          footer={
            <Button
              type="submit"
              form="admin-project-form"
              variant="primary"
              loading={pending}
              loadingLabel={translate(locale, "common.loading")}
            >
              {translate(locale, "admin.createProject")}
            </Button>
          }
        >
          <form
            id="admin-project-form"
            className="ui-next-governance__form ui-next-governance__form--reading"
            onSubmit={(event) => {
              event.preventDefault();
              const formElement = event.currentTarget;
              const form = new FormData(formElement);
              void run(async () => {
                await api("/api/app/projects", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: form.get("name"),
                    researchLens: form.get("researchLens"),
                    description: form.get("description"),
                  }),
                });
                formElement.reset();
                setActiveForm(null);
              });
            }}
          >
            <TextField
              id="admin-project-name"
              name="name"
              label={translate(locale, "admin.projectName")}
              required
            />
            <TextField
              id="admin-project-lens"
              name="researchLens"
              label={translate(locale, "admin.researchLens")}
              required
            />
            <TextArea
              id="admin-project-description"
              name="description"
              label={translate(locale, "admin.projectDescription")}
              rows={2}
            />
          </form>
          {message ? (
            <p role="alert" className="ui-next-governance__error">
              {message}
            </p>
          ) : null}
        </Dialog>
        <ul
          className="ui-next-governance__rows grid gap-2 m-0 p-0 list-none max-h-[32rem] overflow-y-auto pr-2"
          role="list"
          aria-label={translate(locale, "admin.projects")}
          tabIndex={0}
        >
          {projects.map((project) => (
            <li
              key={project.id}
              className="flex max-md:flex-col items-center max-md:items-start justify-between flex-wrap gap-4 py-3 border-t border-ui-border first:border-t-0"
            >
              <div className="min-w-0 flex-[1_1_16rem]">
                <strong className="block text-sm font-semibold text-ui-text">{project.name}</strong>
                <span className="block text-ui-text-muted text-sm break-words">
                  {project.researchLens}
                </span>
              </div>
              <Button
                type="button"
                disabled={pending}
                onClick={() =>
                  void run(() =>
                    api(
                      `/api/app/projects/${encodeURIComponent(project.id)}/capabilities/library`,
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ enabled: !project.features.libraryCirculation }),
                      },
                    ),
                  )
                }
              >
                {project.features.libraryCirculation
                  ? translate(locale, "admin.disableLibrary")
                  : translate(locale, "admin.enableLibrary")}
              </Button>
            </li>
          ))}
        </ul>
      </Surface>

      <Surface className="ui-next-governance__section grid gap-4 content-start">
        <div className="ui-next-governance__heading flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="m-0 text-lg font-bold">{translate(locale, "admin.core")}</h2>
            <p className="m-0 text-sm text-ui-text-secondary">
              {translate(locale, "admin.coreDescription")}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setMessage(null);
              setActiveForm("core");
            }}
          >
            {translate(locale, "admin.grantCore")}
          </Button>
        </div>
        <Dialog
          open={activeForm === "core"}
          onClose={() => {
            if (!pending) setActiveForm(null);
          }}
          title={translate(locale, "admin.grantCore")}
          closeLabel={translate(locale, "common.close")}
          footer={
            <Button
              type="submit"
              form="admin-core-form"
              loading={pending}
              loadingLabel={translate(locale, "common.loading")}
            >
              {translate(locale, "admin.grantCore")}
            </Button>
          }
        >
          <form
            id="admin-core-form"
            className="ui-next-governance__form ui-next-governance__form--compact grid grid-cols-[minmax(0,1fr)_auto] max-md:grid-cols-1 items-end gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void run(async () => {
                await api("/api/app/admin/core", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId: form.get("userId") }),
                });
                setActiveForm(null);
              });
            }}
          >
            <Select
              id="admin-core-user"
              name="userId"
              label={translate(locale, "admin.users")}
              required
              defaultValue=""
            >
              <option value="" disabled>
                —
              </option>
              {users
                .filter(
                  (user) =>
                    !user.disabledAt && !coreMembers.some((member) => member.userId === user.id),
                )
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.displayName} · {user.email}
                  </option>
                ))}
            </Select>
          </form>
          {message ? (
            <p
              role="alert"
              className="ui-next-governance__error m-0 text-sm text-ui-danger font-medium"
            >
              {message}
            </p>
          ) : null}
        </Dialog>
        <ul
          className="ui-next-governance__rows grid gap-2 m-0 p-0 list-none max-h-[32rem] overflow-y-auto pr-2"
          role="list"
          aria-label={translate(locale, "admin.core")}
          tabIndex={0}
        >
          {coreMembers.map((member) => (
            <li
              key={member.userId}
              className="flex max-md:flex-col items-center max-md:items-start justify-between flex-wrap gap-4 py-3 border-t border-ui-border first:border-t-0"
            >
              <div className="min-w-0 flex-[1_1_16rem]">
                <strong className="block text-sm font-semibold text-ui-text">
                  {member.displayName}
                </strong>
                <span className="block text-ui-text-muted text-sm break-words">{member.email}</span>
              </div>
              <Button
                type="button"
                disabled={pending}
                variant="danger"
                onClick={() =>
                  void run(() =>
                    api(`/api/app/admin/core/${encodeURIComponent(member.userId)}`, {
                      method: "DELETE",
                    }),
                  )
                }
              >
                {translate(locale, "admin.revokeCore")}
              </Button>
            </li>
          ))}
        </ul>
      </Surface>

      <Surface className="ui-next-governance__section ui-next-governance__accounts grid gap-4 content-start col-span-full">
        <div className="ui-next-governance__heading flex items-center justify-between flex-wrap gap-3">
          <h2 className="m-0 text-lg font-bold">{translate(locale, "admin.users")}</h2>
          <Button
            type="button"
            onClick={() => {
              setMessage(null);
              setActiveForm("user");
            }}
          >
            {translate(locale, "admin.invite")}
          </Button>
        </div>
        <Dialog
          open={activeForm === "user"}
          onClose={() => {
            if (!pending) setActiveForm(null);
          }}
          title={translate(locale, "admin.invite")}
          closeLabel={translate(locale, "common.close")}
          footer={
            <Button
              type="submit"
              form="admin-user-form"
              variant="primary"
              loading={pending}
              loadingLabel={translate(locale, "common.loading")}
            >
              {translate(locale, "admin.invite")}
            </Button>
          }
        >
          <form
            id="admin-user-form"
            className="ui-next-governance__form ui-next-governance__form--reading grid grid-cols-1 max-w-[42rem] gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const formElement = event.currentTarget;
              const form = new FormData(formElement);
              void run(async () => {
                await api("/api/app/admin/users", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    displayName: form.get("displayName"),
                    email: form.get("email"),
                    role: form.get("role"),
                  }),
                });
                formElement.reset();
                setActiveForm(null);
              });
            }}
          >
            <TextField
              id="admin-user-name"
              name="displayName"
              label={translate(locale, "people.name")}
              required
            />
            <TextField
              id="admin-user-email"
              name="email"
              type="email"
              label={translate(locale, "admin.email")}
              required
            />
            <Select
              id="admin-user-role"
              name="role"
              label={translate(locale, "admin.userRole")}
              defaultValue="user"
            >
              <option value="user">{translate(locale, "account.role.user")}</option>
              <option value="editor">{translate(locale, "account.role.editor")}</option>
              <option value="admin_op">{translate(locale, "account.role.admin_op")}</option>
            </Select>
          </form>
          {message ? (
            <p
              role="alert"
              className="ui-next-governance__error m-0 text-sm text-ui-danger font-medium"
            >
              {message}
            </p>
          ) : null}
        </Dialog>
        <ul
          className="ui-next-governance__rows grid gap-2 m-0 p-0 list-none max-h-[32rem] overflow-y-auto pr-2"
          role="list"
          aria-label={translate(locale, "admin.users")}
          tabIndex={0}
        >
          {users.map((user) => (
            <li
              key={user.id}
              className="flex max-md:flex-col items-center max-md:items-start justify-between flex-wrap gap-4 py-3 border-t border-ui-border first:border-t-0"
            >
              <div className="min-w-0 flex-[1_1_16rem]">
                <strong className="block text-sm font-semibold text-ui-text">
                  {user.displayName}
                </strong>
                <span className="block text-ui-text-muted text-sm break-words">
                  {user.email} ·{" "}
                  {user.invited
                    ? translate(locale, "admin.invited")
                    : translate(locale, `account.role.${user.role}`)}
                </span>
              </div>
              <div className="ui-next-governance__actions flex shrink-0 items-center gap-2 max-md:w-full max-md:flex-wrap">
                <select
                  className="ui-next-control w-48 min-h-[2.5rem] max-md:flex-1 max-md:min-w-[8rem] rounded-md border border-ui-border bg-ui-surface px-3 py-1.5 text-sm text-ui-text outline-none focus:border-ui-focus focus:ring-1 focus:ring-ui-focus"
                  value={user.role}
                  disabled={pending}
                  aria-label={`${translate(locale, "admin.userRole")}: ${user.displayName}`}
                  onChange={(event) =>
                    void run(() =>
                      api(`/api/app/admin/users/${encodeURIComponent(user.id)}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ role: event.target.value }),
                      }),
                    )
                  }
                >
                  <option value="user">{translate(locale, "account.role.user")}</option>
                  <option value="editor">{translate(locale, "account.role.editor")}</option>
                  <option value="admin_op">{translate(locale, "account.role.admin_op")}</option>
                </select>
                <Button
                  type="button"
                  disabled={pending}
                  variant={user.disabledAt ? "secondary" : "danger"}
                  onClick={() =>
                    void run(() =>
                      api(`/api/app/admin/users/${encodeURIComponent(user.id)}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ disabled: !user.disabledAt }),
                      }),
                    )
                  }
                >
                  {user.disabledAt
                    ? translate(locale, "admin.enabled")
                    : translate(locale, "admin.disabled")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Surface>

      <div className="ui-next-governance__status-grid col-span-full grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <Surface className="ui-next-governance__section grid gap-4 content-start">
          <h2 className="m-0 text-lg font-bold">{translate(locale, "admin.operational")}</h2>
          <dl className="ui-next-governance__facts grid gap-2 m-0">
            <div className="flex justify-between flex-wrap gap-4 py-1.5 border-b border-ui-border/50 last:border-b-0">
              <dt className="text-ui-text-secondary text-sm">
                {translate(locale, "admin.checked")}
              </dt>
              <dd className="m-0 font-semibold text-sm text-ui-text">
                {formatUiDate(operationalStatus.checkedAt, locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </dd>
            </div>
            <div className="flex justify-between flex-wrap gap-4 py-1.5 border-b border-ui-border/50 last:border-b-0">
              <dt className="text-ui-text-secondary text-sm">
                {translate(locale, "admin.overdueLoans")}
              </dt>
              <dd className="m-0 font-semibold text-sm text-ui-text">
                {operationalStatus.overdueLoanCount}
              </dd>
            </div>
            <div className="flex justify-between flex-wrap gap-4 py-1.5 border-b border-ui-border/50 last:border-b-0">
              <dt className="text-ui-text-secondary text-sm">
                {translate(locale, "admin.backup")}
              </dt>
              <dd className="m-0 font-semibold text-sm text-ui-text">
                {translate(
                  locale,
                  operationalStatus.backupStatus === "not_configured"
                    ? "admin.backupNotConfigured"
                    : "admin.backupUnknown",
                )}
              </dd>
            </div>
          </dl>
        </Surface>
        <Surface className="ui-next-governance__section grid gap-4 content-start">
          <h2 className="m-0 text-lg font-bold">{translate(locale, "admin.audit")}</h2>
          <ul className="ui-next-governance__audit grid gap-2 m-0 p-0 list-none" role="list">
            {auditEvents.map((event) => (
              <li
                key={event.id}
                className="flex items-center justify-between gap-4 py-2 border-t border-ui-border first:border-t-0"
              >
                <div className="min-w-0 w-full">
                  <strong className="block text-sm font-semibold text-ui-text">
                    {translate(locale, auditLabels[event.action] ?? "admin.audit.other")}
                  </strong>
                  <span className="block text-ui-text-muted text-xs break-words">
                    {event.actorName ?? translate(locale, "admin.audit.unknownActor")} ·{" "}
                    <time dateTime={new Date(event.createdAt).toISOString()}>
                      {formatUiDate(event.createdAt, locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  </span>
                  <details className="ui-next-governance__audit-code mt-1 text-xs text-ui-text-muted">
                    <summary className="cursor-pointer hover:text-ui-text">
                      {translate(locale, "admin.audit.code")}
                    </summary>
                    <code className="font-mono text-xs bg-ui-surface-muted px-1.5 py-0.5 rounded">
                      {event.action}
                    </code>
                  </details>
                </div>
              </li>
            ))}
          </ul>
        </Surface>
      </div>
      {message ? (
        <p
          className="ui-next-governance__error m-0 text-sm text-ui-danger font-medium"
          role="alert"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
