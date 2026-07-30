import type { Role } from "./schema";

export const ACCESS_TITLES = [
  { key: "member", label: "Thành viên", role: "user", capabilities: [] },
  { key: "editor", label: "Biên tập viên", role: "editor", capabilities: [] },
  {
    key: "reviewer",
    label: "Người thẩm định",
    role: "user",
    capabilities: ["content.review"],
  },
  {
    key: "librarian",
    label: "Thủ thư",
    role: "user",
    capabilities: ["catalog.manage", "circulation.manage"],
  },
  {
    key: "space_manager",
    label: "Quản lý không gian",
    role: "user",
    capabilities: ["spaces.manage"],
  },
  {
    key: "operator",
    label: "Vận hành hệ thống",
    role: "admin_op",
    capabilities: ["system.operate"],
  },
  {
    key: "administrator",
    label: "Quản trị hệ thống",
    role: "admin_op",
    capabilities: [
      "audit.read",
      "capabilities.manage",
      "catalog.manage",
      "circulation.manage",
      "content.review",
      "spaces.manage",
      "system.operate",
      "users.manage",
    ],
  },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  role: Role;
  capabilities: readonly string[];
}>;

export type AccessTitle = (typeof ACCESS_TITLES)[number]["key"];

export function accessTitle(key: string) {
  return ACCESS_TITLES.find((title) => title.key === key);
}

export function inferAccessTitle(role: Role, capabilities: string[]): AccessTitle | null {
  const normalized = [...capabilities].sort();
  return (
    ACCESS_TITLES.find(
      (title) =>
        title.role === role &&
        title.capabilities.length === normalized.length &&
        [...title.capabilities]
          .sort()
          .every((capability, index) => capability === normalized[index]),
    )?.key ?? null
  );
}
