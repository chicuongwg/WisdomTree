#!/bin/sh
# Nightly backup: the database and the uploaded objects, which are two
# different things and are useless without each other — a source row whose file
# is gone is not a restorable source.
#
#   ./scripts/backup.sh [destination-dir]
#
# Cron (03:15 daily), from the repo root:
#   15 3 * * * cd /srv/wisdomtree && ./scripts/backup.sh >> /var/log/wisdomtree-backup.log 2>&1
#
# Restore is in docs/operations/operating-playbook.md. A backup nobody has
# restored is a guess: run through it once, on a scratch database, before
# relying on it.
set -eu

DEST="${1:-./backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
DB_URL="${DATABASE_URL:-postgres://wisdomtree:wisdomtree@localhost:5432/wisdomtree}"
OBJECTS="${FILE_STORAGE_DIR:-./data/objects}"

mkdir -p "$DEST"

# --format=custom so restore can be selective and parallel (pg_restore -j).
echo "==> database → $DEST/db-$STAMP.dump"
pg_dump --format=custom --no-owner --dbname="$DB_URL" --file="$DEST/db-$STAMP.dump"

if [ -d "$OBJECTS" ]; then
  echo "==> objects → $DEST/objects-$STAMP.tar.gz"
  tar -czf "$DEST/objects-$STAMP.tar.gz" -C "$(dirname "$OBJECTS")" "$(basename "$OBJECTS")"
else
  echo "!! object store not found at $OBJECTS — database dumped WITHOUT its files" >&2
fi

# Verify the dump is readable rather than trusting that pg_dump exited 0.
pg_restore --list "$DEST/db-$STAMP.dump" > /dev/null
echo "==> verified $DEST/db-$STAMP.dump is readable"

find "$DEST" -name 'db-*.dump' -mtime "+$KEEP_DAYS" -delete
find "$DEST" -name 'objects-*.tar.gz' -mtime "+$KEEP_DAYS" -delete
echo "==> done; keeping $KEEP_DAYS days"
