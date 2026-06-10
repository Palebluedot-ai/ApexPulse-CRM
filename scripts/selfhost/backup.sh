#!/usr/bin/env bash
# Mac mini 自托管：每日备份 Postgres 逻辑数据 + 附件原始证据。
#
# 用法：
#   bash scripts/selfhost/backup.sh
#
# 可用环境变量覆盖默认值：
#   PG_CONTAINER     docker postgres 容器名（默认 apexpulse-crm-postgres）
#   PG_USER          数据库用户（默认 postgres）
#   PG_DB            数据库名（默认 apexpulse_crm）
#   ATTACHMENTS_DIR  附件目录（默认 <项目>/data/attachments）
#   BACKUP_DIR       备份输出目录（默认 ~/otc-crm-backups，放在仓库外）
#   RETENTION_DAYS   保留天数，超期目录会被删除（默认 14）
#
# 备份从 docker 容器内 pg_dump，本机不需要安装 Postgres 客户端。
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

PG_CONTAINER="${PG_CONTAINER:-apexpulse-crm-postgres}"
PG_USER="${PG_USER:-postgres}"
PG_DB="${PG_DB:-apexpulse_crm}"
ATTACHMENTS_DIR="${ATTACHMENTS_DIR:-$PROJECT_DIR/data/attachments}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/otc-crm-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

if [ -z "$BACKUP_DIR" ]; then
  echo "[backup] BACKUP_DIR is empty, refusing to run" >&2
  exit 1
fi

stamp="$(date +%Y%m%d_%H%M%S)"
dest="$BACKUP_DIR/$stamp"
mkdir -p "$dest"

echo "[backup] $stamp -> $dest"

# 1. Postgres 逻辑备份
echo "[backup] dumping database $PG_DB ..."
docker exec "$PG_CONTAINER" pg_dump -U "$PG_USER" -d "$PG_DB" \
  | gzip > "$dest/db_${PG_DB}_${stamp}.sql.gz"

# 2. 附件原始证据
if [ -d "$ATTACHMENTS_DIR" ]; then
  echo "[backup] archiving attachments ..."
  tar -czf "$dest/attachments_${stamp}.tar.gz" \
    -C "$(dirname "$ATTACHMENTS_DIR")" "$(basename "$ATTACHMENTS_DIR")"
else
  echo "[backup] attachments dir not found, skipping: $ATTACHMENTS_DIR"
fi

# 3. 清理过期备份（只删 BACKUP_DIR 下、超过保留天数的备份目录）
echo "[backup] pruning backups older than ${RETENTION_DAYS}d ..."
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime "+${RETENTION_DAYS}" -exec rm -rf {} +

echo "[backup] done. current backups:"
ls -1 "$BACKUP_DIR"
