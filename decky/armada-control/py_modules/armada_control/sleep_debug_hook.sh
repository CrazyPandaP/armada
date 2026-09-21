#!/usr/bin/bash
set -uo pipefail

if [[ "${1:-}" == collect-report ]]; then
    set -e
    report_dir=/var/home/armada
    timestamp=$(date +%Y%m%d-%H%M%S)
    report=$(mktemp "$report_dir/.armada-sleep-debug-auto.XXXXXX")
    if ! /usr/bin/armada-sleep-debug collect >"$report"; then
        rm -f -- "$report"
        echo "armada-sleep-debug collect failed" >&2
        exit 1
    fi
    chown armada:armada "$report"
    mv -- "$report" "$report_dir/armada-sleep-debug-auto-$timestamp.txt"
    mapfile -t old_reports < <(
        find "$report_dir" -maxdepth 1 -type f -name 'armada-sleep-debug-auto-*.txt' -printf '%f\n' |
            sort -r | tail -n +11
    )
    for old_report in "${old_reports[@]}"; do
        rm -f -- "$report_dir/$old_report"
    done
    exit 0
fi

case "${1:-}" in
    prepare|collect) ;;
    *) exit 2 ;;
esac
eval "$(/usr/libexec/armada/device-env 2>/dev/null)" || exit 0
[[ "${ARMADA_SUSPEND_MODE:-fake}" == s2idle ]] || exit 0

if [[ "$1" == prepare ]]; then
    exec /usr/bin/armada-sleep-debug prepare
fi
exec /usr/bin/systemd-run --quiet --no-block --collect /usr/bin/bash "$0" collect-report
