// Seed data for the demo: 3 users (one per role), 2 team spaces + personal spaces,
// ~10 stored sources, ~20 catalog items, 1 active loan.
//
// Membership layout backs the space-scoping proof: the `user`-role member
// belongs to the library space but NOT to "Kho Dự Án Cộng Đồng" —
// its items must be invisible (404) to them.
//
// Re-runnable: truncates all demo tables first (TRUNCATE bypasses the
// append-only row triggers by design; those triggers guard app-path mutations).
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

const FILE_STORAGE_DIR = process.env.FILE_STORAGE_DIR ?? "./data/objects";

const now = () => new Date();
const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000);

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to load demo fixtures with NODE_ENV=production.");
    process.exit(1);
  }
  // This script TRUNCATEs every table below before inserting. NODE_ENV is not
  // a usable guard here — a bare `tsx scripts/db/seed.ts` on a server inherits
  // no environment — so the destructive intent has to be stated at the call
  // site every time. `npm run demo` states it; `npm run db:seed` alone does not.
  if (process.env.ALLOW_DESTRUCTIVE_SEED !== "1") {
    console.error(
      "Refusing to seed: this wipes every table first.\n" +
        `  target: ${process.env.DATABASE_URL ?? "(default) localhost:5432/wisdomtree"}\n` +
        "Re-run with ALLOW_DESTRUCTIVE_SEED=1 if that is what you want.\n" +
        "To start an existing deployment without touching its data, use `npm run start:prod`.",
    );
    process.exit(1);
  }

  const client = new Client({
    connectionString:
      process.env.DATABASE_URL ?? "postgres://wisdomtree:wisdomtree@localhost:5432/wisdomtree",
  });
  await client.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `TRUNCATE loan_tickets, source_physical, categories,
                promotions, tree_node_versions, node_links, node_tags, tags,
                tree_nodes, extraction_candidates, branches,
                vaults,
                text_chunks, source_versions, sources,
                comments, notification_deliveries,
                notification_preferences, notifications,
                deadline_reminders, deadline_links, deadlines,
                tasks, achievements, calendar_tokens,
                audit_events,
                space_members, spaces, users CASCADE`,
    );

    // --- Seeded users (dev auth picker signs in as one of these) ---
    const users = [
      { id: randomUUID(), sub: "dev:lan", email: "lan@wisdomtree.local", name: "Trần Thị Lan", role: "user" },
      { id: randomUUID(), sub: "dev:minh", email: "minh@wisdomtree.local", name: "Lê Văn Minh", role: "editor" },
      { id: randomUUID(), sub: "dev:huong", email: "huong@wisdomtree.local", name: "Phạm Thu Hương", role: "admin_op" },
      { id: randomUUID(), sub: "dev:duc", email: "duc@wisdomtree.local", name: "Tiến Đức", role: "user" },
    ] as const;
    for (const u of users) {
      await client.query(
        `INSERT INTO users (id, google_sub, email, display_name, role) VALUES ($1,$2,$3,$4,$5)`,
        [u.id, u.sub, u.email, u.name, u.role],
      );
    }
    const [lan, minh, huong, duc] = users;

    // With dev-login gone, the demo's own door is Google OIDC. SEED_ADMIN_EMAIL
    // plants an invited admin row for the operator's Gmail so their first real
    // login binds to it (auth/oidc.ts invite-list model).
    if (process.env.SEED_ADMIN_EMAIL) {
      await client.query(
        `INSERT INTO users (google_sub, email, display_name, role)
         VALUES ($1, $2, $3, 'admin_op')`,
        [
          `invited:${randomUUID()}`,
          process.env.SEED_ADMIN_EMAIL.toLowerCase(),
          process.env.SEED_ADMIN_EMAIL.split("@")[0],
        ],
      );
    }

    // --- One personal vault per member + the shared knowledge vault ---
    // Visibility is derived from the vault itself now (shared = everyone,
    // personal = its owner); there are no grant rows.
    const personalVaults = new Map<string, string>();
    for (const u of users) {
      const vaultId = randomUUID();
      personalVaults.set(u.id, vaultId);
      await client.query(
        `INSERT INTO vaults (id, kind, owner_user_id, name)
         VALUES ($1,'personal',$2,$3)`,
        [vaultId, u.id, u.name],
      );
    }
    const sharedVault = randomUUID();
    await client.query(
      `INSERT INTO vaults (id, kind, name) VALUES ($1,'shared','Tri thức chung')`,
      [sharedVault],
    );

    // --- 2 team spaces + 1 personal space each ---
    // The community library is a team space; it doubles
    // as the general team storage home so the count stays exactly 2.
    const library = randomUUID(); // "Thư Viện Cộng Đồng": all 3 users are members
    const teamCommunity = randomUUID(); // "Kho Dự Án Cộng Đồng": minh + huong only → scoping proof vs lan
    const teamSpaces = [
      { id: library, name: "Thư Viện Cộng Đồng" },
      { id: teamCommunity, name: "Kho Dự Án Cộng Đồng" },
    ];
    for (const s of teamSpaces) {
      await client.query(
        `INSERT INTO spaces (id, name, type, created_by) VALUES ($1,$2,'team',$3)`,
        [s.id, s.name, huong.id],
      );
    }
    const personal: Record<string, string> = {};
    for (const u of users) {
      personal[u.id] = randomUUID();
      await client.query(
        `INSERT INTO spaces (id, name, type, owner_user_id, created_by)
         VALUES ($1,$2,'personal',$3,$3)`,
        [personal[u.id], `Không gian cá nhân — ${u.name}`, u.id],
      );
      await client.query(
        `INSERT INTO space_members (space_id, user_id, member_role, added_by)
         VALUES ($1,$2,'manager',$2)`,
        [personal[u.id], u.id],
      );
    }
    const memberships: Array<[string, string]> = [
      [library, lan.id],
      [library, minh.id],
      [library, huong.id],
      [library, duc.id],
      [teamCommunity, minh.id],
      [teamCommunity, huong.id],
    ];
    for (const [spaceId, userId] of memberships) {
      await client.query(
        `INSERT INTO space_members (space_id, user_id, member_role, added_by)
         VALUES ($1,$2,$3,$4)`,
        [spaceId, userId, userId === huong.id ? "manager" : "contributor", huong.id],
      );
    }

    // --- ~10 stored sources with original files on the local object store ---
    // Mixed extraction states prove store-first: pending/unprocessable items
    // are still visible in Library and downloadable.
    const sourceDefs: Array<{
      space: string;
      title: string;
      uploader: (typeof users)[number];
      extraction: "processed" | "pending" | "unprocessable";
    }> = [
      { space: library, title: "Báo cáo khảo sát thực địa 2025", uploader: lan, extraction: "processed" },
      { space: library, title: "Biên bản họp nhóm tháng 6", uploader: lan, extraction: "processed" },
      { space: library, title: "Danh mục tài liệu tham khảo", uploader: minh, extraction: "processed" },
      { space: library, title: "Ảnh chụp tư liệu viết tay", uploader: lan, extraction: "pending" },
      { space: library, title: "Bản scan sổ ghi chép cũ", uploader: minh, extraction: "unprocessable" },
      { space: teamCommunity, title: "Kế hoạch dự án cộng đồng 2026", uploader: minh, extraction: "processed" },
      { space: teamCommunity, title: "Danh sách nhà tài trợ", uploader: huong, extraction: "processed" },
      { space: teamCommunity, title: "Bản đồ khu vực khảo sát", uploader: minh, extraction: "pending" },
      { space: personal[lan.id], title: "Ghi chú đọc sách cá nhân", uploader: lan, extraction: "processed" },
      { space: library, title: "Tổng hợp phỏng vấn người dân", uploader: minh, extraction: "processed" },
    ];

    await mkdir(FILE_STORAGE_DIR, { recursive: true });
    let chunkSeed = 0;
    const sourceByTitle: Record<string, { sourceId: string; versionId: string; chunkIds: string[] }> = {};
    for (const def of sourceDefs) {
      const sourceId = randomUUID();
      const versionId = randomUUID();
      const objectKey = `${sourceId}/${versionId}`;
      const body = Buffer.from(
        `WisdomTree demo file\n\n${def.title}\nNgười tải lên: ${def.uploader.name}\n`,
        "utf8",
      );
      await mkdir(path.join(FILE_STORAGE_DIR, sourceId), { recursive: true });
      await writeFile(path.join(FILE_STORAGE_DIR, objectKey), body);
      await writeFile(path.join(FILE_STORAGE_DIR, `${objectKey}.meta`), "text/plain", "utf8");
      const checksum = createHash("sha256").update(body).digest("hex");

      await client.query(
        `INSERT INTO sources (id, space_id, title, submitted_by) VALUES ($1,$2,$3,$4)`,
        [sourceId, def.space, def.title, def.uploader.id],
      );
      await client.query(
        `INSERT INTO source_versions
           (id, source_id, seq, original_object_key, original_filename, mime_type,
            size_bytes, checksum_sha256, storage_state, extraction_status,
            extraction_meta, uploaded_by, stored_at)
         VALUES ($1,$2,1,$3,$4,'text/plain',$5,$6,'stored',$7,$8,$9,$10)`,
        [
          versionId,
          sourceId,
          objectKey,
          `${def.title}.txt`,
          body.byteLength,
          checksum,
          def.extraction,
          def.extraction === "processed"
            ? JSON.stringify({ engine: "stub", confidence: 1 })
            : def.extraction === "unprocessable"
              ? JSON.stringify({ engine: "stub", error: "định dạng không trích xuất được" })
              : null,
          def.uploader.id,
          now(),
        ],
      );
      await client.query(`UPDATE sources SET current_version_id = $1 WHERE id = $2`, [
        versionId,
        sourceId,
      ]);
      const chunkIds: string[] = [];
      if (def.extraction === "processed") {
        for (let i = 0; i < 2; i++) {
          const { rows: chunk } = await client.query(
            `INSERT INTO text_chunks (source_version_id, position, ref_type, ref_label, content)
             VALUES ($1,$2,'paragraph',$3,$4) RETURNING id`,
            [versionId, i, `¶ ${i + 1}`, `Đoạn trích mẫu ${++chunkSeed} của "${def.title}".`],
          );
          chunkIds.push(chunk[0].id);
        }
      }
      sourceByTitle[def.title] = { sourceId, versionId, chunkIds };
    }

    // --- Knowledge tree: 2 team branches, 4 published nodes (mixed
    // verification, incl. one no_source manual), provenance promotions for
    // the source-driven ones.
    // Each user also gets 1 personal branch (scope='personal') so the sidebar
    // "Không Gian Của Tôi" section is non-empty from first boot. ---
    const branchFolk = randomUUID();
    const branchHistory = randomUUID();
    await client.query(
      `INSERT INTO branches (id, vault_id, name, description, scope, created_by) VALUES
         ($1,$3,'Văn Hóa Dân Gian','Tập quán, lễ hội và tri thức truyền miệng của cộng đồng.','team',$4),
         ($2,$3,'Lịch Sử Địa Phương','Các sự kiện, nhân vật và địa danh của khu vực khảo sát.','team',$4)`,
      [branchFolk, branchHistory, sharedVault, minh.id],
    );

    // Personal branches — one per user, empty by default (user fills them in).
    for (const u of users) {
      await client.query(
        `INSERT INTO branches (vault_id, name, scope, owner_user_id, created_by)
         VALUES ($1,$2,'personal',$3,$3)`,
        [personalVaults.get(u.id), `Ghi chú cá nhân — ${u.name}`, u.id],
      );
    }


    type NodeDef = {
      branch: string;
      title: string;
      slug: string;
      verification: "no_source" | "unverified" | "verified";
      publish: boolean;
      fromSource?: string; // sourceDefs title → promotion provenance
      contentMd: string;
    };
    const nodeDefs: NodeDef[] = [
      {
        branch: branchHistory,
        title: "Kết quả khảo sát thực địa 2025",
        slug: "ket-qua-khao-sat-thuc-dia-2025",
        verification: "verified",
        publish: true,
        fromSource: "Báo cáo khảo sát thực địa 2025",
        contentMd:
          "# Kết quả khảo sát thực địa 2025\n\nTổng hợp các phát hiện chính từ đợt khảo sát thực địa năm 2025.\n\n- Ghi nhận **12 địa điểm** có giá trị tư liệu.\n- Phỏng vấn 34 người dân địa phương.\n- Đối chiếu với [[Ghi chép các cuộc họp cộng đồng]] để thống nhất lịch số hóa.\n\n## Kết luận\n\nCần số hóa toàn bộ tư liệu viết tay trước mùa mưa.",
      },
      {
        branch: branchFolk,
        title: "Tri thức dân gian qua phỏng vấn người dân",
        slug: "tri-thuc-dan-gian-qua-phong-van",
        verification: "verified",
        publish: false,
        fromSource: "Tổng hợp phỏng vấn người dân",
        contentMd:
          "# Tri thức dân gian qua phỏng vấn người dân\n\nCác mảng tri thức truyền miệng thu thập được qua chuỗi phỏng vấn.\n\n- Kinh nghiệm canh tác theo con nước.\n- Bài thuốc dân gian từ cây quanh nhà.\n- Phần nghi lễ được tách riêng sang [[Lễ hội đình làng: phác thảo ban đầu|phác thảo lễ hội đình làng]].",
      },
      {
        branch: branchHistory,
        title: "Ghi chép các cuộc họp cộng đồng",
        slug: "ghi-chep-cac-cuoc-hop-cong-dong",
        verification: "unverified",
        publish: false,
        fromSource: "Biên bản họp nhóm tháng 6",
        contentMd:
          "# Ghi chép các cuộc họp cộng đồng\n\nTóm tắt biên bản họp nhóm tháng 6, chờ đối chiếu thêm nguồn.\n\n- Thống nhất lịch số hóa tư liệu.\n- Phân công người phụ trách từng kho.\n- Số liệu nền lấy từ [[Kết quả khảo sát thực địa 2025]].",
      },
      {
        branch: branchFolk,
        title: "Lễ hội đình làng: phác thảo ban đầu",
        slug: "le-hoi-dinh-lang-phac-thao-ban-dau",
        verification: "no_source",
        publish: false,
        contentMd:
          "# Lễ hội đình làng: phác thảo ban đầu\n\nTrang tạo thủ công, chưa gắn tư liệu dẫn chứng.\n\n- Cần bổ sung ảnh chụp và lời kể của người cao tuổi.\n- Nền tri thức truyền miệng: [[Tri thức dân gian qua phỏng vấn người dân]].",
      },
    ];
    const nodeIdBySlug: Record<string, string> = {};
    for (const def of nodeDefs) {
      const nodeId = randomUUID();
      nodeIdBySlug[def.slug] = nodeId;
      await client.query(
        `INSERT INTO tree_nodes (id, branch_id, title, slug, content_md, verification, publish, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [nodeId, def.branch, def.title, def.slug, def.contentMd, def.verification, def.publish, minh.id],
      );
      const { rows: nodeVersion } = await client.query(
        `INSERT INTO tree_node_versions
           (node_id, seq, content_md, verification, created_by, change_summary, review_status)
         VALUES ($1,1,$2,$3,$4,$5,'legacy_accepted') RETURNING id`,
        [
          nodeId,
          def.contentMd,
          def.verification,
          def.fromSource ? huong.id : minh.id,
          def.fromSource ? `Xuất bản từ tư liệu "${def.fromSource}"` : "Tạo trang thủ công",
        ],
      );
      if (def.fromSource) {
        const src = sourceByTitle[def.fromSource];
        await client.query(
          `INSERT INTO promotions (source_version_id, node_version_id, approved_by, excerpt_chunk_ids)
           VALUES ($1,$2,$3,$4)`,
          [src.versionId, nodeVersion[0].id, huong.id, src.chunkIds.length ? src.chunkIds : null],
        );
      }
    }

    // Wiki-links between the seeded pages, mirrored into node_links exactly
    // as the service's derived sync would write them (link_type 'related').
    // Without these a fresh seed opens on an empty map and empty backlink
    // panels, which is precisely the "the tree looks like a folder tree"
    // impression we are fixing.
    const seededWikiLinks: Array<[string, string]> = [
      ["ket-qua-khao-sat-thuc-dia-2025", "ghi-chep-cac-cuoc-hop-cong-dong"],
      ["tri-thuc-dan-gian-qua-phong-van", "le-hoi-dinh-lang-phac-thao-ban-dau"],
      ["ghi-chep-cac-cuoc-hop-cong-dong", "ket-qua-khao-sat-thuc-dia-2025"],
      ["le-hoi-dinh-lang-phac-thao-ban-dau", "tri-thuc-dan-gian-qua-phong-van"],
    ];
    for (const [fromSlug, toSlug] of seededWikiLinks) {
      await client.query(
        `INSERT INTO node_links (from_node_id, to_node_id, link_type)
         VALUES ($1,$2,'related') ON CONFLICT DO NOTHING`,
        [nodeIdBySlug[fromSlug], nodeIdBySlug[toSlug]],
      );
    }


    // --- ~20 catalog items in the library space, 1 active loan ---
    const catalogTitles: Array<[string, string]> = [
      ["Đại Việt Sử Ký Toàn Thư", "Ngô Sĩ Liên"],
      ["Truyện Kiều", "Nguyễn Du"],
      ["Nhật Ký Trong Tù", "Hồ Chí Minh"],
      ["Số Đỏ", "Vũ Trọng Phụng"],
      ["Dế Mèn Phiêu Lưu Ký", "Tô Hoài"],
      ["Lược Sử Thời Gian", "Stephen Hawking"],
      ["Đắc Nhân Tâm", "Dale Carnegie"],
      ["Nhà Giả Kim", "Paulo Coelho"],
      ["Tuổi Thơ Dữ Dội", "Phùng Quán"],
      ["Vang Bóng Một Thời", "Nguyễn Tuân"],
      ["Chí Phèo — Tuyển Tập", "Nam Cao"],
      ["Sapiens: Lược Sử Loài Người", "Yuval Noah Harari"],
      ["Từ Điển Hán Việt", "Đào Duy Anh"],
      ["Văn Minh Việt Nam", "Nguyễn Văn Huyên"],
      ["Đất Rừng Phương Nam", "Đoàn Giỏi"],
      ["Bí Mật Của Naoko", "Higashino Keigo"],
      ["Không Gia Đình", "Hector Malot"],
      ["Hoàng Tử Bé", "Antoine de Saint-Exupéry"],
      ["Sổ Tay Trồng Rừng Ngập Mặn", "Bộ NN&PTNT"],
      ["Cẩm Nang Sơ Cấp Cứu", "Hội Chữ Thập Đỏ"],
    ];
    // Books are Library items now: a sources row (category "Sách") plus the
    // shelf facts in source_physical. Loans key on the physical row id.
    const bookCategory = randomUUID();
    await client.query(`INSERT INTO categories (id, name) VALUES ($1,'Sách')`, [bookCategory]);
    const itemIds: string[] = [];
    for (let i = 0; i < catalogTitles.length; i++) {
      const [title, author] = catalogTitles[i];
      const bookSourceId = randomUUID();
      const id = randomUUID();
      itemIds.push(id);
      await client.query(
        `INSERT INTO sources (id, space_id, title, category_id, submitted_by)
         VALUES ($1,$2,$3,$4,$5)`,
        [bookSourceId, library, title, bookCategory, huong.id],
      );
      await client.query(
        `INSERT INTO source_physical (id, source_id, item_code, author, location, status, created_by)
         VALUES ($1,$2,$3,$4,$5,'available',$6)`,
        [id, bookSourceId, `LIB-${String(i + 1).padStart(6, "0")}`, author, `Kệ ${String.fromCharCode(65 + (i % 4))}${(i % 5) + 1}`, huong.id],
      );
    }

    // 1 active loan: Lan is borrowing item 1, approved and handed over by Hương.
    const borrowedItem = itemIds[0];
    await client.query(
      `INSERT INTO loan_tickets
         (item_id, borrower_id, state, requested_at, approved_at, borrowed_at, due_at, handled_by)
       VALUES ($1,$2,'borrowed',$3,$4,$5,$6,$7)`,
      [borrowedItem, lan.id, daysFromNow(-3), daysFromNow(-2), daysFromNow(-2), daysFromNow(5), huong.id],
    );
    await client.query(`UPDATE source_physical SET status = 'borrowed' WHERE id = $1`, [borrowedItem]);

    // 1 closed loan on the same item, so the Catalog Item Detail loan record
    // has a history to show under the current holder: Minh had it before Lan,
    // approved and taken back by Hương. Only ACTIVE loans are unique per item,
    // so a returned ticket sits happily beside the borrowed one.
    await client.query(
      `INSERT INTO loan_tickets
         (item_id, borrower_id, state, requested_at, approved_at, borrowed_at, due_at, returned_at, handled_by)
       VALUES ($1,$2,'returned',$3,$4,$5,$6,$7,$8)`,
      [
        borrowedItem, minh.id,
        daysFromNow(-40), daysFromNow(-39), daysFromNow(-39), daysFromNow(-25), daysFromNow(-27),
        huong.id,
      ],
    );

    // --- PM: 3 deadlines across the two team spaces (one due within 7 days so
    // the 7-day reminder offset fires on the next reminder tick), with
    // checklist/document links, 2 board tasks, calendar tokens per user ---
    const dlReport = randomUUID();
    const dlFunding = randomUUID();
    const dlConference = randomUUID();
    await client.query(
      `INSERT INTO deadlines (id, space_id, title, type, due_at, created_by) VALUES
         ($1,$4,'Báo cáo tổng kết quý III','report',$7,$6),
         ($2,$5,'Hồ sơ xin tài trợ dự án cộng đồng','funding',$8,$6),
         ($3,$4,'Hội thảo tri thức bản địa','conference',$9,$6)`,
      [dlReport, dlFunding, dlConference, library, teamCommunity, huong.id,
       daysFromNow(5), daysFromNow(20), daysFromNow(45)],
    );

    const taskDigitize = randomUUID();
    const taskCatalog = randomUUID();
    await client.query(
      `INSERT INTO tasks (id, title, state, assigned_to, created_by) VALUES
         ($1,'Số hóa sổ ghi chép cũ trước mùa mưa','doing',$3,$4),
         ($2,'Soạn danh mục sách bổ sung cho thư viện','todo',NULL,$4)`,
      [taskDigitize, taskCatalog, minh.id, huong.id],
    );

    // Checklist/documents on the near deadline: a task and a stored source.
    await client.query(
      `INSERT INTO deadline_links (deadline_id, target_type, target_id) VALUES
         ($1,'task',$2),
         ($1,'source',$3)`,
      [dlReport, taskDigitize, sourceByTitle["Báo cáo khảo sát thực địa 2025"].sourceId],
    );

    // Calendar tokens: one active per user (ICS feed, no session).
    for (const u of users) {
      await client.query(
        `INSERT INTO calendar_tokens (token, user_id) VALUES ($1,$2)`,
        [randomBytes(24).toString("base64url"), u.id],
      );
    }

    // --- Notify: 2 comments on the published node — one plain, one with an
    // inline @mention of the librarian. The loan-ticket comment is gone: a
    // loan carries a factual record on Catalog Item Detail, not a discussion
    // (owner decision 2026-07-20). The mention still seeds the "comment
    // mentioning a member" matrix row, so the fixture count and the proofs
    // that depend on it are unchanged. ---
    await client.query(
      `INSERT INTO comments (anchor_type, anchor_id, author_id, body) VALUES
         ('tree_node',$1,$2,'Phần kết luận nên bổ sung số liệu của đợt khảo sát bổ sung tháng 5.')`,
      [nodeIdBySlug["ket-qua-khao-sat-thuc-dia-2025"], lan.id],
    );
    const mentionComment = await client.query(
      `INSERT INTO comments (anchor_type, anchor_id, author_id, body, mentions) VALUES
         ('tree_node',$1,$2,$4,$3) RETURNING id`,
      [
        nodeIdBySlug["ket-qua-khao-sat-thuc-dia-2025"],
        lan.id,
        `{${huong.id}}`,
        `@${huong.name} xem giúp em phần phụ lục với ạ.`,
      ],
    );
    // The mention notification the comment fan-out would have written. Seeding it keeps
    // every event in the notification-link proof present from a fresh seed, so
    // that proof's coverage does not depend on an earlier proof run having
    // written the row.
    await client.query(
      `INSERT INTO notifications (user_id, event_type, payload) VALUES ($1,'comment.created',$2)`,
      [
        huong.id,
        JSON.stringify({
          commentId: mentionComment.rows[0].id,
          anchorType: "tree_node",
          anchorId: nodeIdBySlug["ket-qua-khao-sat-thuc-dia-2025"],
          authorId: lan.id,
          mentions: [huong.id],
        }),
      ],
    );

    await client.query("COMMIT");
    console.log(
      "Seed OK: 3 users, 2 team spaces (incl. library) + 3 personal, 10 stored sources, 20 catalog items, 1 active loan + 1 returned loan on the same item, " +
        "2 branches, 4 published nodes (mixed verification incl. 1 no_source), 4 wiki-links between them, " +
        "3 deadlines (1 due in 5 days), 2 tasks, 2 comments on the node (1 with an inline @mention), calendar tokens per user.",
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
