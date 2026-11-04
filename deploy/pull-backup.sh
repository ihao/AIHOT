#!/usr/bin/env bash
# Run on naban only. Pull the latest complete EU snapshot over read-only SFTP.
set -euo pipefail
umask 077
[[ $(id -u) -eq 0 ]] || { echo 'Run as root' >&2; exit 1; }

root=/srv/ninebtc-backup
key=/root/.ssh/ninebtc_pull_ed25519
known_hosts=/root/.ssh/ninebtc_eu_known_hosts
remote=ninebtc_pull@62.171.163.77
for path in "$key" "$known_hosts"; do
  [[ -r $path ]] || { echo "Missing SSH file: $path" >&2; exit 1; }
done
install -d -m 0700 "$root" "$root/daily" "$root/weekly" "$root/monthly"
exec 9>/run/lock/ninebtc-pull-backup.lock
flock -n 9 || { echo '9BTC pull already running' >&2; exit 1; }
stage=$(mktemp -d "$root/.partial.XXXXXXXX")
trap 'rm -f -- "$stage"/*; rmdir -- "$stage"' EXIT

ssh_opts=(-o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes \
  -o "UserKnownHostsFile=$known_hosts" -i "$key")
printf 'get latest %s/latest\n' "$stage" | sftp -q -b - "${ssh_opts[@]}" "$remote"
stamp=$(cat "$stage/latest")
[[ $stamp =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || { echo 'Invalid EU snapshot marker' >&2; exit 1; }
if [[ -d $root/daily/$stamp ]]; then
  (cd "$root/daily/$stamp" && sha256sum --check --status "ninebtc-${stamp}.sha256")
  printf '9BTC snapshot already verified: %s\n' "$stamp"
  exit 0
fi

dump="ninebtc-${stamp}.dump"
files="ninebtc-files-${stamp}.tar.gz"
manifest="ninebtc-${stamp}.sha256"
printf 'get %s %s/%s\nget %s %s/%s\nget %s %s/%s\n' \
  "$dump" "$stage" "$dump" "$files" "$stage" "$files" \
  "$manifest" "$stage" "$manifest" | sftp -q -b - "${ssh_opts[@]}" "$remote"
(cd "$stage" && sha256sum --check --status "$manifest")
mv -- "$stage" "$root/daily/$stamp"
stage=$root/daily/$stamp
trap - EXIT
rm -f -- "$stage/latest"

if [[ $(TZ=Asia/Shanghai date +%u) == 7 ]]; then
  cp -al -- "$root/daily/$stamp" "$root/weekly/$stamp"
fi
if [[ $(TZ=Asia/Shanghai date +%d) == 01 ]]; then
  cp -al -- "$root/daily/$stamp" "$root/monthly/$stamp"
fi
for policy in 'daily 7' 'weekly 28' 'monthly 92'; do
  read -r tier days <<< "$policy"
  find "$root/$tier" -mindepth 2 -maxdepth 2 -type f -mtime "+$days" -delete
  find "$root/$tier" -mindepth 1 -maxdepth 1 -type d -empty -delete
done
printf '9BTC offsite backup pulled and verified: %s\n' "$stamp"
