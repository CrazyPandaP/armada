#!/usr/bin/env bash
# Prints a package's content hash, used as the tag for its published artifacts.
# The prepare job and the image build both derive it here, so they resolve the
# same image. Hashing Containerfile whole means editing it rebuilds everything.
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
pkg="${1:?usage: package-hash.sh <package>}"
[ -d "${pkg}" ] || { echo "unknown package: ${pkg}" >&2; exit 1; }

paths=("${pkg}" toolchain.env Containerfile scrub-scratch.sh)
case "${pkg}" in
    mesa-x86|mesa-android) paths+=(mesa) ;;
esac

if grep -q '/src/TERRA.env' "${pkg}/build.sh" 2>/dev/null; then
    paths+=(TERRA.env)
fi

# Exclusions for local builds
{
    for p in "${paths[@]}"; do
        if [ -d "$p" ]; then
            find "$p" -type f \
                -not -path "*/out/*" -not -path "*/.ccache/*" \
                -not -path "*/work/*" -not -path "*/target/*" -print0
        else
            printf '%s\0' "$p"
        fi
    done
} | LC_ALL=C sort -z | xargs -0 sha256sum | sha256sum | cut -c1-32
