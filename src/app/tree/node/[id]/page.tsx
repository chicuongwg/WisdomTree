import { Crumbs } from "@/app/components/crumbs";
import Link from "next/link";
import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import {
  getNode,
  getLatestPublicationForNode,
  getNodeNavigation,
  getNodeTranslation,
  getPendingDraftReviewsForNode,
  listNodeOptions,
  listPublicationTargets,
  wikiIndex,
} from "@/modules/knowledge/service";
import { badgeToneClass, day, nodeLinkTypeLabel, T } from "@/lib/vi";
import { Markdown } from "@/lib/markdown";
import { parseBlocks } from "@/lib/markdown-core";
import { wikiPath } from "@/lib/wiki-path";
import { normalizeTitle } from "@/lib/wikilink";
import { NodeLink } from "@/app/components/node-link";
import { VerificationBadge } from "@/app/components/verification-badge";
import { NodeAdminActions } from "@/app/components/node-admin-actions";
import { listMentionCandidates } from "@/modules/notify/service";
import { CommentsSection } from "@/app/components/comments-section";
import { PresenceRow } from "@/app/components/presence-row";
import { NodePublicationAction } from "@/app/components/node-publication-action";
import { NodeProtectionAction } from "@/app/components/node-protection-action";
import { InlineDraftReview } from "@/app/components/inline-draft-review";

// Static, not generateMetadata: naming the record in the tab would cost a
// second read of it on every detail view (the getters take a freshly built
// principal, so the request cache cannot dedupe the two calls). The kind of
// screen is what makes a browser history list usable again; the record's own
// name is already the h1.
export const metadata = { title: T.node };

// Screen: Node Detail (`/tree/node/:id`) — the primary reading surface with
// verification badge and provenance summary (user-screen-specs.md).
export default async function NodeDetailPage({
  params,
  searchParams = Promise.resolve({}),
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ lang?: string }>;
}) {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const { id } = await params;
  const node = await orNotFound(() => getNode(actor, id));
  const requestedLanguage = (await searchParams).lang === "en" ? "en" : "vi";
  const translation = await getNodeTranslation(actor, id, "en");
  const display = requestedLanguage === "en" && translation ? translation : node;
  const isOwnPersonalNode =
    node.branchScope === "personal" &&
    (node.branchOwnerId === user.id || node.createdBy === user.id);
  const canManageShared =
    node.branchScope === "team" &&
    (user.role === "admin_op" ||
      (user.role === "editor" &&
        user.spaceMemberships.some(
          (membership) => membership.spaceId === node.branchSpaceId && membership.role !== "viewer",
        )));
  const canDraftShared =
    node.branchScope === "team" &&
    (user.role === "admin_op" ||
      user.spaceMemberships.some(
        (membership) => membership.spaceId === node.branchSpaceId && membership.role !== "viewer",
      ));
  const canProtect =
    node.branchScope === "team" &&
    (user.role === "admin_op" ||
      user.spaceMemberships.some(
        (membership) => membership.spaceId === node.branchSpaceId && membership.role === "manager",
      ));
  const canEdit = isOwnPersonalNode || canDraftShared;
  const candidates =
    canManageShared && node.verification !== "archived" ? await listNodeOptions(actor) : [];
  const [publicationTargets, pendingPublication] = isOwnPersonalNode
    ? await Promise.all([
        listPublicationTargets(actor),
        getLatestPublicationForNode(actor, node.id),
      ])
    : [[], null];
  const pendingDraftReviews = canManageShared
    ? await getPendingDraftReviewsForNode(actor, node.id)
    : [];
  const wiki = await wikiIndex(actor);
  const navigation = await getNodeNavigation(actor, node.id);
  const headings = parseBlocks(display.contentMd).filter(
    (block) => block.type === "heading" && block.level >= 2 && block.level <= 3,
  );

  return (
    <main className="page">
      <Crumbs items={[{ label: T.tree, href: "/tree" }]} />
      {node.canonicalNodeId && (
        <p className="notice">
          {T.mergedNotice}{" "}
          <Link href={`/tree/node/${node.canonicalNodeId}`}>{T.openCanonical}</Link>
        </p>
      )}
      <h1>
        {display.title} <VerificationBadge verification={node.verification} />
        {/* Published is an outcome, not an enum row of its own: `done` tone. */}
        {node.publish && <span className={badgeToneClass("done")}>{T.publish}</span>}
        {node.reviewRequired && <span className="badge">Protected</span>}
      </h1>
      <p className="muted">
        {T.branch}: <Link href={`/tree/branch/${node.branchId}`}>{node.branchName}</Link>
        {node.tags.length > 0 && (
          <>
            {" · "}
            {T.tags}: {node.tags.join(", ")}
          </>
        )}
      </p>
      <p className="wiki-languages">
        <Link
          href={wikiPath(node.id, node.slug)}
          aria-current={requestedLanguage === "vi" ? "page" : undefined}
        >
          VI
        </Link>
        {" · "}
        {translation ? (
          <Link
            href={`${wikiPath(node.id, node.slug)}?lang=en`}
            aria-current={requestedLanguage === "en" ? "page" : undefined}
          >
            EN
          </Link>
        ) : (
          <span className="muted">EN chưa có</span>
        )}
      </p>
      {requestedLanguage === "en" && !translation && (
        <p className="notice">Trang này chưa có bản English; đang hiển thị bản tiếng Việt.</p>
      )}
      {display.summary && <p className="wiki-summary">{display.summary}</p>}
      {/* The same page key as the editor, on purpose: the reader sitting on
          this page is exactly who the editor needs to know about, and the
          editor is exactly who this reader needs to know about before they
          click "sửa". A separate key per screen would split one room in two. */}
      <PresenceRow pageKey={`node:${node.id}`} />
      <InlineDraftReview nodeId={node.id} actorId={user.id} reviews={pendingDraftReviews} />

      <div className="with-side">
        <div>
          <Markdown content={display.contentMd} wikiIndex={wiki} />
          <nav className="wiki-pagination" aria-label="Trang trước và trang sau">
            {navigation.previous ? (
              <Link href={wikiPath(navigation.previous.id, navigation.previous.slug)}>
                ← {navigation.previous.title}
              </Link>
            ) : (
              <span />
            )}
            {navigation.next && (
              <Link href={wikiPath(navigation.next.id, navigation.next.slug)}>
                {navigation.next.title} →
              </Link>
            )}
          </nav>
          {/* A second map lived here: ~600px of settings, zoom buttons, canvas,
              mouse-and-keyboard help and legend, to draw two dots and one line.
              The two link panels in the rail already name those relationships,
              in words and with context. One link into the real map instead. */}
          <p>
            <Link href={`/graph?node=${node.id}`}>{T.openOnMap}</Link>
          </p>
          <CommentsSection
            anchorType="tree_node"
            anchorId={node.id}
            members={await listMentionCandidates("tree_node", node.id)}
          />
        </div>
        <div>
          {headings.length > 0 && (
            <nav className="panel wiki-toc" aria-label="Mục lục trang">
              <h2>Mục lục</h2>
              <ul>
                {headings.map(
                  (heading, index) =>
                    heading.type === "heading" && (
                      <li key={`${heading.text}-${index}`} className={`depth-${heading.level - 2}`}>
                        <a href={`#${normalizeTitle(heading.text).replace(/\s+/g, "-")}`}>
                          {heading.text}
                        </a>
                      </li>
                    ),
                )}
              </ul>
            </nav>
          )}
          <div className="panel">
            <h2>{T.provenance}</h2>
            {node.provenance.length === 0 && node.personalOrigins.length === 0 ? (
              <p className="muted">
                {node.verification === "no_source"
                  ? "Trang tạo thủ công, chưa gắn tư liệu dẫn chứng."
                  : T.empty}
              </p>
            ) : (
              <ul>
                {node.provenance.map((p, i) => (
                  <li key={i}>
                    <Link href={`/library/${p.sourceId}`}>{p.sourceTitle}</Link>
                    <div className="meta">
                      {T.approvedByLabel}: {p.approvedByName} · {day(p.createdAt)}
                      {p.excerptChunkIds?.length ? ` · ${p.excerptChunkIds.length} trích đoạn` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {node.personalOrigins.map((origin) => (
              <p key={origin.sourceNodeId}>
                Từ trang cá nhân:{" "}
                <Link href={`/tree/node/${origin.sourceNodeId}`}>{origin.sourceTitle}</Link>
                <span className="meta">
                  {" "}
                  · {T.approvedByLabel}: {origin.approvedByName}
                </span>
              </p>
            ))}
          </div>
          {/* Outgoing: pages this one points at (wiki-links + typed links). */}
          <div className="panel">
            <h2>{T.outgoingLinks}</h2>
            {node.links.length === 0 ? (
              <p className="muted">{T.wikiHelp}</p>
            ) : (
              <ul className="link-list">
                {node.links.map((l) => (
                  <li key={`${l.toNodeId}-${l.linkType}`}>
                    <span className="badge muted">{nodeLinkTypeLabel(l.linkType)}</span>{" "}
                    <NodeLink nodeId={l.toNodeId}>{l.title}</NodeLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Incoming: who points here. Separate from provenance on purpose —
              provenance is "what source backs this", this is "who cites it". */}
          <div className="panel">
            <h2>{T.backlinks}</h2>
            {node.backlinks.length === 0 ? (
              <p className="muted">{T.noBacklinks}</p>
            ) : (
              <ul className="link-list">
                {node.backlinks.map((b) => (
                  <li key={`${b.fromNodeId}-${b.linkType}`}>
                    <span className="badge muted">{nodeLinkTypeLabel(b.linkType)}</span>{" "}
                    <NodeLink nodeId={b.fromNodeId} verification={b.verification}>
                      {b.title}
                    </NodeLink>
                    {b.context && <span className="backlink-context">{b.context}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {canEdit && node.verification !== "archived" && (
            <p>
              <Link className="button" href={`/tree/node/${node.id}/edit`}>
                {T.editNode}
              </Link>
            </p>
          )}
          {canEdit && node.verification !== "archived" && (
            <p>
              <Link href={`/tree/node/${node.id}/translate/en`}>Biên soạn bản English</Link>
            </p>
          )}
          <p>
            <Link href={`/tree/node/${node.id}/history`}>{T.nodeHistory}</Link>
          </p>
          {canManageShared && node.verification !== "archived" && (
            <NodeAdminActions nodeId={node.id} candidates={candidates} />
          )}
          {canProtect && node.verification !== "archived" && (
            <NodeProtectionAction nodeId={node.id} reviewRequired={node.reviewRequired} />
          )}
          {isOwnPersonalNode && node.verification !== "archived" && (
            <NodePublicationAction
              nodeId={node.id}
              branches={publicationTargets}
              latest={pendingPublication}
            />
          )}
        </div>
      </div>
    </main>
  );
}
