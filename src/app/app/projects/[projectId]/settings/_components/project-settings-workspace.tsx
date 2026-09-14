"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import {
  Button,
  PageHeader,
  Select,
  Surface,
  TextArea,
  TextField,
  translate,
} from "@/app/components/ui-next";

type Project = {
  id: string;
  version: number;
  researchLens: string;
  description: string | null;
  status: "active" | "paused" | "completed" | "archived";
  isPersonal: boolean;
};
type Member = {
  userId: string;
  displayName: string;
  role: "user" | "editor" | "admin_op";
  memberRole: "viewer" | "contributor" | "manager";
};
type Candidate = { id: string; displayName: string; role: "user" | "editor" | "admin_op" };
type Operator = { userId: string; displayName: string };

class RequestError extends Error {}

async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { code?: string } | null;
    throw new RequestError(body?.code ?? "request_failed");
  }
}

export function ProjectSettingsWorkspace({
  locale,
  project,
  personal,
  members,
  candidates,
  operators,
  libraryEnabled,
}: {
  locale: UiLocale;
  project: Project;
  personal: boolean;
  members: Member[];
  candidates: Candidate[];
  operators: Operator[];
  libraryEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const availableMembers = useMemo(
    () =>
      candidates.filter((candidate) => !members.some((member) => member.userId === candidate.id)),
    [candidates, members],
  );
  const availableOperators = useMemo(
    () =>
      members.filter((member) => !operators.some((operator) => operator.userId === member.userId)),
    [members, operators],
  );
  const managerCount = members.filter((member) => member.memberRole === "manager").length;

  async function run(operation: () => Promise<void>) {
    setPending(true);
    setMessage(null);
    try {
      await operation();
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof RequestError && error.message === "project_requires_manager"
          ? translate(locale, "settings.lastManagerError")
          : translate(locale, "settings.actionFailed"),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="ui-next-governance grid gap-6">
      <PageHeader
        headingLevel={2}
        title={translate(locale, "settings.title")}
        description={translate(
          locale,
          personal ? "settings.personalDescription" : "settings.description",
        )}
      />
      <Surface className="ui-next-governance__section grid gap-4">
        <h3 className="m-0 text-base font-semibold">{translate(locale, "settings.metadata")}</h3>
        <form
          className="ui-next-governance__form ui-next-governance__form--reading grid grid-cols-1 max-w-[42rem] gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void run(() =>
              api(`/api/app/projects/${encodeURIComponent(project.id)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  expectedVersion: project.version,
                  researchLens: form.get("researchLens"),
                  description: form.get("description"),
                  status: form.get("status"),
                }),
              }),
            );
          }}
        >
          <TextField
            id="project-settings-lens"
            name="researchLens"
            label={translate(locale, "settings.researchLens")}
            description={translate(locale, "settings.researchLensDescription")}
            defaultValue={project.researchLens}
            required
          />
          <TextArea
            id="project-settings-description"
            name="description"
            label={translate(locale, "settings.projectDescription")}
            defaultValue={project.description ?? ""}
            rows={3}
          />
          <Select
            id="project-settings-status"
            name="status"
            label={translate(locale, "settings.status")}
            defaultValue={project.status}
          >
            <option value="active">{translate(locale, "shell.projectStatus.active")}</option>
            <option value="paused">{translate(locale, "shell.projectStatus.paused")}</option>
            <option value="completed">{translate(locale, "shell.projectStatus.completed")}</option>
            <option value="archived">{translate(locale, "shell.projectStatus.archived")}</option>
          </Select>
          <Button
            type="submit"
            variant="primary"
            loading={pending}
            loadingLabel={translate(locale, "common.loading")}
          >
            {translate(locale, "common.save")}
          </Button>
        </form>
      </Surface>
      {!personal ? (
        <Surface className="ui-next-governance__section">
          <h3>{translate(locale, "settings.export.title")}</h3>
          <p>{translate(locale, "settings.export.description")}</p>
          <Button
            type="button"
            variant="secondary"
            loading={pending}
            loadingLabel={translate(locale, "common.loading")}
            onClick={() =>
              void run(() =>
                api(`/api/app/projects/${encodeURIComponent(project.id)}/export`, {
                  method: "POST",
                }),
              )
            }
          >
            {translate(locale, "settings.export.submit")}
          </Button>
        </Surface>
      ) : null}

      {!personal ? (
        <Surface className="ui-next-governance__section grid gap-4">
          <div className="ui-next-governance__heading flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="m-0 text-base font-semibold">
                {translate(locale, "settings.members")}
              </h3>
              <p className="m-0 mt-1 text-sm text-ui-text-secondary">
                {translate(locale, "settings.membersDescription")}
              </p>
            </div>
          </div>
          <form
            className="ui-next-governance__form ui-next-governance__form--compact grid grid-cols-[minmax(0,1fr)_minmax(10rem,0.5fr)_auto] max-md:grid-cols-1 items-end gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void run(() =>
                api(`/api/app/projects/${encodeURIComponent(project.id)}/members`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    userId: form.get("userId"),
                    memberRole: form.get("memberRole"),
                  }),
                }),
              );
            }}
          >
            <Select
              id="project-member"
              name="userId"
              label={translate(locale, "settings.addMember")}
              defaultValue=""
              required
            >
              <option value="" disabled>
                —
              </option>
              {availableMembers.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.displayName} · {translate(locale, `account.role.${candidate.role}`)}
                </option>
              ))}
            </Select>
            <Select
              id="project-member-role"
              name="memberRole"
              label={translate(locale, "settings.memberRole")}
              defaultValue="contributor"
            >
              <option value="viewer">{translate(locale, "settings.memberRole.viewer")}</option>
              <option value="contributor">
                {translate(locale, "settings.memberRole.contributor")}
              </option>
              <option value="manager">{translate(locale, "settings.memberRole.manager")}</option>
            </Select>
            <Button
              type="submit"
              loading={pending}
              loadingLabel={translate(locale, "common.loading")}
            >
              {translate(locale, "settings.addMember")}
            </Button>
          </form>
          <ul className="ui-next-governance__rows grid gap-2 list-none m-0 p-0" role="list">
            {members.map((member) => (
              <li
                key={member.userId}
                className="flex items-center max-md:flex-col max-md:items-start justify-between gap-4 py-3 border-t border-ui-border"
              >
                <div>
                  <strong className="text-ui-text text-sm font-semibold">
                    {member.displayName}
                  </strong>
                  <span className="block text-xs text-ui-text-muted">
                    {translate(locale, `account.role.${member.role}`)}
                  </span>
                  {member.memberRole === "manager" && managerCount === 1 ? (
                    <span className="ui-next-muted block text-xs text-ui-text-muted">
                      {translate(locale, "settings.lastManager")}
                    </span>
                  ) : null}
                </div>
                <div className="ui-next-governance__actions flex shrink-0 items-center gap-2 max-md:w-full max-md:flex-wrap">
                  <select
                    className="ui-next-control w-48 max-md:w-full"
                    value={member.memberRole}
                    disabled={member.memberRole === "manager" && managerCount === 1}
                    aria-label={translate(locale, "settings.memberRoleNamed", {
                      name: member.displayName,
                    })}
                    onChange={(event) =>
                      void run(() =>
                        api(
                          `/api/app/projects/${encodeURIComponent(project.id)}/members/${encodeURIComponent(member.userId)}`,
                          {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ memberRole: event.target.value }),
                          },
                        ),
                      )
                    }
                  >
                    <option value="viewer">
                      {translate(locale, "settings.memberRole.viewer")}
                    </option>
                    <option value="contributor">
                      {translate(locale, "settings.memberRole.contributor")}
                    </option>
                    <option value="manager">
                      {translate(locale, "settings.memberRole.manager")}
                    </option>
                  </select>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={member.memberRole === "manager" && managerCount === 1}
                    aria-label={translate(locale, "settings.removeMemberNamed", {
                      name: member.displayName,
                    })}
                    onClick={() =>
                      void run(() =>
                        api(
                          `/api/app/projects/${encodeURIComponent(project.id)}/members/${encodeURIComponent(member.userId)}`,
                          { method: "DELETE" },
                        ),
                      )
                    }
                  >
                    {translate(locale, "settings.removeMember")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}

      {!personal && libraryEnabled ? (
        <Surface className="ui-next-governance__section grid gap-4">
          <div className="ui-next-governance__heading flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="m-0 text-base font-semibold">
                {translate(locale, "settings.libraryOperators")}
              </h3>
              <p className="m-0 mt-1 text-sm text-ui-text-secondary">
                {translate(locale, "settings.libraryOperatorsDescription")}
              </p>
            </div>
          </div>
          <form
            className="ui-next-governance__form ui-next-governance__form--compact grid grid-cols-[minmax(0,1fr)_minmax(10rem,0.5fr)_auto] max-md:grid-cols-1 items-end gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void run(() =>
                api(`/api/app/projects/${encodeURIComponent(project.id)}/library/operators`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId: form.get("userId") }),
                }),
              );
            }}
          >
            <Select
              id="project-operator"
              name="userId"
              label={translate(locale, "settings.grantOperator")}
              defaultValue=""
              required
            >
              <option value="" disabled>
                —
              </option>
              {availableOperators.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.displayName}
                </option>
              ))}
            </Select>
            <Button
              type="submit"
              loading={pending}
              loadingLabel={translate(locale, "common.loading")}
            >
              {translate(locale, "settings.grantOperator")}
            </Button>
          </form>
          <ul className="ui-next-governance__rows grid gap-2 list-none m-0 p-0" role="list">
            {operators.map((operator) => (
              <li
                key={operator.userId}
                className="flex items-center justify-between gap-4 py-3 border-t border-ui-border"
              >
                <strong className="text-ui-text text-sm font-semibold">
                  {operator.displayName}
                </strong>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() =>
                    void run(() =>
                      api(
                        `/api/app/projects/${encodeURIComponent(project.id)}/library/operators/${encodeURIComponent(operator.userId)}`,
                        { method: "DELETE" },
                      ),
                    )
                  }
                >
                  {translate(locale, "settings.revokeOperator")}
                </Button>
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}
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
