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

# Signature integrity. A launch proves less than it looks: AMFI only validates the code it actually
# loads, and App Store Connect rejects an upload for any nested binary that does not verify.
codesign --verify --deep --strict "$app" || fail "signature does not verify"

# `--deep` follows bundles, not loose binaries: the addon in Resources is checked on its own.
addon="$app/Contents/Resources/keychain.node"
[ -f "$addon" ] || fail "no keychain addon in Resources — the layout changed, this check is blind"
codesign --verify --strict "$addon" || fail "the keychain addon is not signed"

# Written to a file, not piped: `grep -q` closes the pipe early, which `pipefail` reports as failure.
codesign -d -vv "$app" > "$work/signature" 2>&1

# Hardened runtime. The Mac App Store does not require it and the keychain works without it, so
# nothing misses it at runtime — it is kept for the memory protection it buys.
grep -q 'flags=.*runtime' "$work/signature" || fail "hardened runtime is off"

# The embedded profile: no profile, no access group. Fatal at launch too, but CI cannot launch the
# app, so this is where such a build is caught.
[ -f "$app/Contents/embedded.provisionprofile" ] || fail "no embedded provisioning profile"

# Keychain entitlements, on the main binary. `amfid` validates them against the profile, and the
# store's items live in the group they name. Also fatal at launch, also out of CI's reach.
entitlements "$app" > "$work/app.plist"
has "$work/app.plist" 'com.apple.application-identifier' || fail "main binary: no application-identifier"
has "$work/app.plist" 'keychain-access-groups' || fail "main binary: no keychain-access-groups"

# The sandbox. App Store Connect refuses an app without it, and the helpers inherit it from here.
has "$work/app.plist" 'com.apple.security.app-sandbox' || fail "main binary: no app-sandbox"

# Chromium in a MAS build derives its application group from `ElectronTeamID` and the bundle id; a
# group the entitlements do not grant leaves the helpers unable to start, with no message of ours.
info="$app/Contents/Info.plist"
group="$(plutil -extract ElectronTeamID raw -o - "$info" 2> /dev/null || true).$(plutil -extract CFBundleIdentifier raw -o - "$info")"
# PlistBuddy, not plutil: plutil reads the dots in the key as a key path.
/usr/libexec/PlistBuddy -c 'Print :com.apple.security.application-groups' "$work/app.plist" 2> /dev/null |
    sed 's/^ *//' | grep -qxF "$group" || fail "main binary: application-groups does not grant $group"

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

# Helpers carry exactly the sandbox and its inheritance. The renderer runs in them, so anything more
# is a path to the keychain group, and an inheriting helper with any other key is killed at launch.
# Hence also the guard: a changed layout must not pass by leaving nothing to check.
helpers=("$app"/Contents/Frameworks/*Helper*.app)
[ ${#helpers[@]} -gt 0 ] || fail "no helper bundles found — the layout changed, this check is blind"

for helper in "${helpers[@]}"; do
    entitlements "$helper" > "$work/helper.plist"
    [ "$(/usr/libexec/PlistBuddy -c 'Print' "$work/helper.plist" | grep -c ' = ')" = 2 ] &&
        has "$work/helper.plist" 'com.apple.security.app-sandbox' &&
        has "$work/helper.plist" 'com.apple.security.inherit' ||
        fail "$(basename "$helper") must carry exactly app-sandbox and inherit"

    # Without its own `allow-jit` a helper under the hardened runtime cannot reserve V8's JIT region,
    # and the renderer dies at start with "Failed to reserve virtual memory for CodeRange".
    codesign -d -vv "$helper" > "$work/helper-signature" 2>&1
    ! grep -q 'flags=.*runtime' "$work/helper-signature" ||
        fail "$(basename "$helper") has the hardened runtime on — V8 cannot JIT there without allow-jit"
done

# The profile's remaining life. An expired one stops the entitlement being honoured for copies
# already installed, so signing days before expiry yields a build that starts here and stops days later.
expires=''

if security cms -D -i "$app/Contents/embedded.provisionprofile" > "$work/profile.plist" 2> /dev/null; then
    expires=$(plutil -extract ExpirationDate raw -o - "$work/profile.plist" 2> /dev/null || true)
fi

if [ -z "$expires" ]; then
    echo "warning: the embedded profile could not be read — expiry and type unchecked" >&2
else
    # A Developer ID profile signs fine and is refused only by App Store Connect, after the upload.
    ! plutil -extract ProvisionsAllDevices raw -o - "$work/profile.plist" > /dev/null 2>&1 ||
        fail "the embedded profile is a Developer ID one — a Mac App Store build needs an App Store or development profile"

    [[ $expires > $(date -u +%Y-%m-%dT%H:%M:%SZ) ]] || fail "the embedded profile expired on $expires"

    # The signing certificate must be one the profile lists, or AMFI kills the app before it runs a
    # line — a plain `killed` in the terminal and nothing else. Signing with the wrong identity of the
    # same team passes every other check here.
    codesign -d --extract-certificates="$work/cert" "$app" > /dev/null 2>&1 ||
        fail "could not extract the signing certificate"
    leaf=$(base64 -i "$work/cert0")
    listed=''
    n=0

    while plutil -extract "DeveloperCertificates.$n" raw -o - "$work/profile.plist" > "$work/listed" 2> /dev/null; do
        [ "$(tr -d '\n' < "$work/listed")" = "$leaf" ] && listed=yes
        n=$((n + 1))
    done

    [ -n "$listed" ] || fail "signed by $(grep -m1 '^Authority=' "$work/signature" | cut -d= -f2-), which the embedded profile does not list — the app would be killed at launch"
fi

grep -m1 '^Authority=' "$work/signature" | sed 's/^Authority=/OK: signed by /'

if [ -n "$expires" ]; then
    echo "OK: profile expires $expires"
fi
