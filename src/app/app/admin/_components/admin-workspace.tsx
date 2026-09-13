"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import {
  Button,
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
    <div className="ui-next-governance ui-next-governance--admin">
      <Surface className="ui-next-governance__section">
        <div className="ui-next-governance__heading">
          <h2>{translate(locale, "admin.projects")}</h2>
        </div>
        <form
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
          <Button
            type="submit"
            variant="primary"
            loading={pending}
            loadingLabel={translate(locale, "common.loading")}
          >
            {translate(locale, "admin.createProject")}
          </Button>
        </form>
        <ul
          className="ui-next-governance__rows"
          role="list"
          aria-label={translate(locale, "admin.projects")}
          tabIndex={0}
        >
          {projects.map((project) => (
            <li key={project.id}>
              <div>
                <strong>{project.name}</strong>
                <span>{project.researchLens}</span>
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

      <Surface className="ui-next-governance__section">
        <div className="ui-next-governance__heading">
          <h2>{translate(locale, "admin.users")}</h2>
        </div>
        <form
          className="ui-next-governance__form ui-next-governance__form--reading"
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
          <Button
            type="submit"
            variant="primary"
            loading={pending}
            loadingLabel={translate(locale, "common.loading")}
          >
            {translate(locale, "admin.invite")}
          </Button>
        </form>
        <ul
          className="ui-next-governance__rows"
          role="list"
          aria-label={translate(locale, "admin.users")}
          tabIndex={0}
        >
          {users.map((user) => (
            <li key={user.id}>
              <div>
                <strong>{user.displayName}</strong>
                <span>
                  {user.email} ·{" "}
                  {user.invited
                    ? translate(locale, "admin.invited")
                    : translate(locale, `account.role.${user.role}`)}
                </span>
              </div>
              <div className="ui-next-governance__actions">
                <select
                  className="ui-next-control"
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

      <Surface className="ui-next-governance__section">
        <div className="ui-next-governance__heading">
          <div>
            <h2>{translate(locale, "admin.core")}</h2>
            <p>{translate(locale, "admin.coreDescription")}</p>
          </div>
        </div>
        <form
          className="ui-next-governance__form ui-next-governance__form--compact"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void run(() =>
              api("/api/app/admin/core", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: form.get("userId") }),
              }),
            );
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
          <Button
            type="submit"
            loading={pending}
            loadingLabel={translate(locale, "common.loading")}
          >
            {translate(locale, "admin.grantCore")}
          </Button>
        </form>
        <ul
          className="ui-next-governance__rows"
          role="list"
          aria-label={translate(locale, "admin.core")}
          tabIndex={0}
        >
          {coreMembers.map((member) => (
            <li key={member.userId}>
              <div>
                <strong>{member.displayName}</strong>
                <span>{member.email}</span>
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

      <div className="ui-next-governance__status-grid">
        <Surface className="ui-next-governance__section">
          <h2>{translate(locale, "admin.operational")}</h2>
          <dl className="ui-next-governance__facts">
            <div>
              <dt>{translate(locale, "admin.checked")}</dt>
              <dd>
                {formatUiDate(operationalStatus.checkedAt, locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </dd>
            </div>
            <div>
              <dt>{translate(locale, "admin.overdueLoans")}</dt>
              <dd>{operationalStatus.overdueLoanCount}</dd>
            </div>
            <div>
              <dt>{translate(locale, "admin.backup")}</dt>
              <dd>
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
        <Surface className="ui-next-governance__section">
          <h2>{translate(locale, "admin.audit")}</h2>
          <ul className="ui-next-governance__audit" role="list">
            {auditEvents.map((event) => (
              <li key={event.id}>
                <div>
                  <strong>
                    {translate(locale, auditLabels[event.action] ?? "admin.audit.other")}
                  </strong>
                  <span>
                    {event.actorName ?? translate(locale, "admin.audit.unknownActor")} ·{" "}
                    <time dateTime={new Date(event.createdAt).toISOString()}>
                      {formatUiDate(event.createdAt, locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </time>
                  </span>
                  <details className="ui-next-governance__audit-code">
                    <summary>{translate(locale, "admin.audit.code")}</summary>
                    <code>{event.action}</code>
                  </details>
                </div>
              </li>
            ))}
          </ul>
        </Surface>
      </div>
      {message ? (
        <p className="ui-next-governance__error" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
