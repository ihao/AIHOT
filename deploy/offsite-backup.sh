#!/usr/bin/env bash
# EU host only: dump 9BTC and copy verified snapshots to a separate OPS server.
set -euo pipefail
umask 077

if [[ $(id -u) -ne 0 ]]; then
  printf '9BTC backup must run as root on the EU host\n' >&2
  exit 1
fi

config=${NINEBTC_BACKUP_CONFIG:-/etc/ninebtc-backup.conf}
if [[ ! -f $config ]]; then
  printf '9BTC backup config is missing\n' >&2
  exit 1
fi
# shellcheck source=/dev/null
source "$config"
: "${BACKUP_HOST:?}"
: "${BACKUP_USER:?}"
: "${BACKUP_REMOTE_DIR:?}"
: "${BACKUP_KEY:?}"
: "${BACKUP_KNOWN_HOSTS:?}"

# These values are used by rsync's remote shell; reject characters that could
# change the command or send a backup outside the dedicated destination.
[[ $BACKUP_HOST =~ ^[a-zA-Z0-9.-]+$ ]] || exit 1
[[ $BACKUP_USER =~ ^[a-z_][a-z0-9_-]*$ ]] || exit 1
[[ $BACKUP_REMOTE_DIR =~ ^/[a-zA-Z0-9_./-]+$ && $BACKUP_REMOTE_DIR != *..* ]] || exit 1
[[ $BACKUP_KEY =~ ^/[a-zA-Z0-9_./-]+$ && $BACKUP_KNOWN_HOSTS =~ ^/[a-zA-Z0-9_./-]+$ ]] || exit 1
[[ -r $BACKUP_KEY && -r $BACKUP_KNOWN_HOSTS ]] || exit 1

repo=/srv/9btc
local_dir=/var/backups/ninebtc
install -d -m 0700 "$local_dir"
exec 9>/run/lock/ninebtc-backup.lock
flock -n 9 || { printf '9BTC backup is already running\n' >&2; exit 1; }

stamp=$(date -u +%Y%m%dT%H%M%SZ)
dump="${local_dir}/ninebtc-${stamp}.dump"
files="${local_dir}/ninebtc-files-${stamp}.tar.gz"
dump_tmp="${dump}.partial"
files_tmp="${files}.partial"
trap 'rm -f -- "$dump_tmp" "$files_tmp"' EXIT

cd "$repo"
docker compose --env-file .env -f deploy/eu.compose.yml exec -T db \
  pg_dump -U ninebtc --format=custom --compress=6 --no-owner ninebtc > "$dump_tmp"
docker compose --env-file .env -f deploy/eu.compose.yml exec -T db \
  pg_restore --list < "$dump_tmp" > /dev/null

docker compose --env-file .env -f deploy/eu.compose.yml exec -T web sh -c \
  'if [ -d /data/uploads ]; then tar -czf - -C /data uploads; else tar -czf - --files-from /dev/null; fi' > "$files_tmp"
tar -tzf "$files_tmp" > /dev/null
mv -- "$dump_tmp" "$dump"
mv -- "$files_tmp" "$files"

remote="${BACKUP_USER}@${BACKUP_HOST}"
ssh_opts=(-i "$BACKUP_KEY" -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$BACKUP_KNOWN_HOSTS")
remote_shell="ssh -i $BACKUP_KEY -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=$BACKUP_KNOWN_HOSTS"
ssh "${ssh_opts[@]}" "$remote" "test -d $BACKUP_REMOTE_DIR/daily && test -d $BACKUP_REMOTE_DIR/weekly && test -d $BACKUP_REMOTE_DIR/monthly"
rsync -tp --chmod=F600 -e "$remote_shell" "$dump" "$files" "$remote:$BACKUP_REMOTE_DIR/daily/"

dump_name=${dump##*/}
files_name=${files##*/}
local_hashes=$(cd "$local_dir" && sha256sum "$dump_name" "$files_name")
remote_hashes=$(ssh "${ssh_opts[@]}" "$remote" "cd $BACKUP_REMOTE_DIR/daily && sha256sum $dump_name $files_name")
[[ $local_hashes == "$remote_hashes" ]] || { printf '9BTC offsite checksum mismatch\n' >&2; exit 1; }

if [[ $(TZ=Asia/Shanghai date +%u) == 7 ]]; then
  ssh "${ssh_opts[@]}" "$remote" "ln $BACKUP_REMOTE_DIR/daily/$dump_name $BACKUP_REMOTE_DIR/weekly/$dump_name && ln $BACKUP_REMOTE_DIR/daily/$files_name $BACKUP_REMOTE_DIR/weekly/$files_name"
fi
if [[ $(TZ=Asia/Shanghai date +%d) == 01 ]]; then
  ssh "${ssh_opts[@]}" "$remote" "ln $BACKUP_REMOTE_DIR/daily/$dump_name $BACKUP_REMOTE_DIR/monthly/$dump_name && ln $BACKUP_REMOTE_DIR/daily/$files_name $BACKUP_REMOTE_DIR/monthly/$files_name"
fi

# Prune only snapshots created by this script, after a new remote copy passes its checksum.
ssh "${ssh_opts[@]}" "$remote" \
  "find $BACKUP_REMOTE_DIR/daily -maxdepth 1 -type f -name 'ninebtc-*' -mtime +7 -delete; find $BACKUP_REMOTE_DIR/weekly -maxdepth 1 -type f -name 'ninebtc-*' -mtime +28 -delete; find $BACKUP_REMOTE_DIR/monthly -maxdepth 1 -type f -name 'ninebtc-*' -mtime +92 -delete"
find "$local_dir" -maxdepth 1 -type f -name 'ninebtc-*' -mtime +3 -delete
install -d -m 0700 /var/lib/ninebtc-backup
printf '%s\n' "$stamp" > /var/lib/ninebtc-backup/last-success
printf '9BTC offsite backup complete: %s\n' "$stamp"
