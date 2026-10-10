#!/usr/bin/env bash
# Run on EU only. This job never opens a network connection to the backup host.
set -euo pipefail
umask 027

[[ $(id -u) -eq 0 ]] || { echo 'Run as root' >&2; exit 1; }
repo=/srv/9btc
backup_dir=/var/backups/ninebtc
group=ninebtc_pull
install -d -o root -g "$group" -m 0750 "$backup_dir"
exec 9>/run/lock/ninebtc-local-backup.lock
flock -n 9 || { echo '9BTC local backup already running' >&2; exit 1; }

stamp=$(date -u +%Y%m%dT%H%M%SZ)
dump_name="ninebtc-${stamp}.dump"
files_name="ninebtc-files-${stamp}.tar.gz"
dump_tmp="$backup_dir/$dump_name.partial"
files_tmp="$backup_dir/$files_name.partial"
manifest_tmp="$backup_dir/ninebtc-${stamp}.sha256.partial"
latest_tmp="$backup_dir/latest.partial"
trap 'rm -f -- "$dump_tmp" "$files_tmp" "$manifest_tmp" "$latest_tmp"' EXIT

cd "$repo"
docker compose --env-file .env -f deploy/eu.compose.yml exec -T db \
  pg_dump -U ninebtc --format=custom --compress=6 --no-owner ninebtc > "$dump_tmp"
docker compose --env-file .env -f deploy/eu.compose.yml exec -T db \
  pg_restore --list < "$dump_tmp" > /dev/null
docker compose --env-file .env -f deploy/eu.compose.yml exec -T api sh -c \
  'if [ -d /data/uploads ]; then tar -czf - -C /data uploads; else tar -czf - --files-from /dev/null; fi' > "$files_tmp"
tar -tzf "$files_tmp" > /dev/null

chmod 0640 "$dump_tmp" "$files_tmp"
chgrp "$group" "$dump_tmp" "$files_tmp"
mv -- "$dump_tmp" "$backup_dir/$dump_name"
mv -- "$files_tmp" "$backup_dir/$files_name"
(cd "$backup_dir" && sha256sum "$dump_name" "$files_name") > "$manifest_tmp"
chmod 0640 "$manifest_tmp"
chgrp "$group" "$manifest_tmp"
mv -- "$manifest_tmp" "$backup_dir/ninebtc-${stamp}.sha256"
printf '%s\n' "$stamp" > "$latest_tmp"
chmod 0640 "$latest_tmp"
chgrp "$group" "$latest_tmp"
mv -- "$latest_tmp" "$backup_dir/latest"

# Prune only completed 9BTC snapshot files older than four days.
find "$backup_dir" -maxdepth 1 -type f \
  \( -name 'ninebtc-*.dump' -o -name 'ninebtc-files-*.tar.gz' -o -name 'ninebtc-*.sha256' \) \
  -mtime +4 -delete
printf '9BTC local backup complete: %s\n' "$stamp"
