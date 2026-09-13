import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { notificationLink } from "@/modules/notify/links";
import { enMessages } from "@/app/components/ui-next/localization/locales/en";
import { viMessages } from "@/app/components/ui-next/localization/locales/vi";

export async function run() {
  const collaboration = "src/app/components/ui-next/collaboration-section.tsx";
  const notificationPage = "src/app/app/notifications/page.tsx";
  const notificationCenter = "src/app/app/notifications/_components/notification-center.tsx";
  for (const file of [collaboration, notificationPage, notificationCenter]) {
    assert.equal(existsSync(file), true, `missing PR3 target surface: ${file}`);
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /@\/db|drizzle|schema\//, `direct DB access in ${file}`);
  }

  const collaborationSource = readFileSync(collaboration, "utf8");
  assert.match(collaborationSource, /role="listbox"/);
  assert.match(collaborationSource, /ArrowDown/);
  assert.match(collaborationSource, /parentCommentId/);
  assert.match(collaborationSource, /#comment-/);
  assert.match(collaborationSource, /PRESENCE_BEAT_MS = 45_000/);

  const notePage = readFileSync("src/app/app/projects/[projectId]/notes/[noteId]/page.tsx", "utf8");
  const materialPage = readFileSync(
    "src/app/app/projects/[projectId]/materials/[materialId]/page.tsx",
    "utf8",
  );
  assert.match(notePage, /getAppCollaborationContext/);
  assert.match(materialPage, /getAppCollaborationContext/);

  const appFacade = readFileSync("src/modules/application/collaboration.ts", "utf8");
  assert.match(appFacade, /kind: "note"/);
  assert.match(appFacade, /kind: "material"/);
  assert.match(appFacade, /kind: "activity"/);
  assert.match(appFacade, /kind: "task"/);
  assert.match(appFacade, /requireOperationalProjectMember/);
  assert.match(appFacade, /personalOwnerId/);
  assert.doesNotMatch(appFacade, /@\/db|drizzle|schema\//);

  const commentsSchema = readFileSync("src/modules/notify/schema.ts", "utf8");
  assert.match(commentsSchema, /enum: \["source", "tree_node", "deadline", "activity", "task"\]/);

  const navigation = readFileSync("src/app/components/ui-next/shell/navigation.tsx", "utf8");
  assert.match(navigation, /href: "\/app\/notifications"/);
  const header = readFileSync("src/app/components/ui-next/shell/app-header.tsx", "utf8");
  assert.match(header, /unreadNotifications/);
  assert.match(header, /href="\/app\/notifications"/);

  const targetLink = notificationLink(
    "comment.created",
    { anchorType: "tree_node", anchorId: "note-1", commentId: "comment-1" },
    {
      anchorHrefs: { "tree_node:note-1": "/app/projects/project-1/notes/note-1" },
      anchorTitles: { "tree_node:note-1": "Target Note" },
    },
  );
  assert.deepEqual(targetLink, {
    href: "/app/projects/project-1/notes/note-1#comment-comment-1",
    label: "Bạn được nhắc đến trong một thảo luận",
    subject: "Target Note",
  });
  assert.equal(
    notificationLink("comment.created", { anchorType: "source", anchorId: "old" }),
    null,
    "an unavailable context must not fall back to a legacy route",
  );

  const publicNote = readFileSync("src/app/p/[slug]/page.tsx", "utf8");
  assert.doesNotMatch(publicNote, /CollaborationSection|presence|comments/i);

  for (const key of [
    "nav.notifications",
    "notifications.title",
    "collaboration.title",
    "collaboration.mentionHelp",
    "collaboration.viewing",
  ] as const) {
    assert.ok(viMessages[key]);
    assert.ok(enMessages[key]);
  }
}
