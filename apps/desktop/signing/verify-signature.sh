#!/usr/bin/env bash
# Every guarantee of the secret store is a property of the signature, and most of them fail without
# a symptom. Run it on any signed build — CI does, and so should a hand-made one.
set -euo pipefail

app=${1:?usage: verify-signature.sh <path to .app>}
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
shopt -s nullglob

fail() {
    echo "FAIL: $1" >&2
    exit 1
}

entitlements() {
    codesign -d --entitlements - --xml "$1" 2> /dev/null
}

has() {
    /usr/libexec/PlistBuddy -c "Print :$2" "$1" > /dev/null 2>&1
}

# Signature integrity. A launch proves less than it looks: QA strips the quarantine flag, so
# Gatekeeper never assesses the bundle, and AMFI only validates the code it actually loads.
codesign --verify --deep --strict "$app" || fail "signature does not verify"

# Written to a file, not piped: `grep -q` closes the pipe early, which `pipefail` reports as failure.
codesign -d -vv "$app" > "$work/signature" 2>&1

# Hardened runtime. The keychain works without it, so nothing at runtime misses it — it buys memory
# protection and is a precondition for notarisation.
grep -q 'flags=.*runtime' "$work/signature" || fail "hardened runtime is off"

# The embedded profile: no profile, no access group. Fatal at launch too, but CI cannot launch the
# app — its runner is in no profile's device list — so this is where such a build is caught.
[ -f "$app/Contents/embedded.provisionprofile" ] || fail "no embedded provisioning profile"

# Keychain entitlements, on the main binary. `amfid` validates them against the profile, and the
# store's items live in the group they name. Also fatal at launch, also out of CI's reach.
entitlements "$app" > "$work/app.plist"
has "$work/app.plist" 'com.apple.application-identifier' || fail "main binary: no application-identifier"
has "$work/app.plist" 'keychain-access-groups' || fail "main binary: no keychain-access-groups"

# The debugging entitlement, nowhere. It costs nothing at runtime and shows nowhere: the app behaves
# exactly as before, only now another process can attach and read a secret out of its memory.
for key in 'com.apple.security.get-task-allow' 'get-task-allow'; do
    ! has "$work/app.plist" "$key" || fail "main binary carries $key — another process could read secrets from its memory"
done

# The camera, and no other device. A microphone entitlement would let a compromised renderer record
# with no UI of ours involved, and nothing in this app has a use for one.
has "$work/app.plist" 'com.apple.security.device.camera' || fail "main binary: no camera entitlement — the QR scanner cannot open a camera"

for key in 'com.apple.security.device.microphone' 'com.apple.security.device.audio-input'; do
    ! has "$work/app.plist" "$key" || fail "main binary carries $key — this app has no use for a microphone"
done

# Helpers stay outside the keychain group. The renderer runs in them, and extra privilege never
# breaks anything — it only adds a path. Hence also the guard: a changed layout must not pass by
# leaving nothing to check.
helpers=("$app"/Contents/Frameworks/*Helper*.app)
[ ${#helpers[@]} -gt 0 ] || fail "no helper bundles found — the layout changed, this check is blind"

for helper in "${helpers[@]}"; do
    entitlements "$helper" > "$work/helper.plist"
    ! has "$work/helper.plist" 'com.apple.application-identifier' ||
        fail "$(basename "$helper") carries application-identifier — the renderer could reach the keychain group"
done

# The profile's remaining life. An expired one stops the entitlement being honoured for copies
# already installed, so signing days before expiry yields a build that starts here and dies at QA.
expires=''

if security cms -D -i "$app/Contents/embedded.provisionprofile" > "$work/profile.plist" 2> /dev/null; then
    expires=$(plutil -extract ExpirationDate raw -o - "$work/profile.plist" 2> /dev/null || true)
fi

if [ -z "$expires" ]; then
    echo "warning: the embedded profile could not be read — expiry unchecked" >&2
else
    [[ $expires > $(date -u +%Y-%m-%dT%H:%M:%SZ) ]] || fail "the embedded profile expired on $expires"
fi

grep -m1 '^Authority=' "$work/signature" | sed 's/^Authority=/OK: signed by /'

if [ -n "$expires" ]; then
    echo "OK: profile expires $expires"
fi
