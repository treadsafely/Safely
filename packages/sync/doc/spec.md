# Specification

This specification describes the Safely Sync protocol, which is a local-first, end-to-end encrypted, real-time 
synchronization protocol for user data across multiple devices.

# 0. Overview

The protocol goal is to securely synchronize user secrets and related metadata between multiple devices. It is designed
for small and rarely editable storages. It is not designed for collaborative editing, large files, or high-frequency 
updates. 

It is assumed that one account can have only one owner. It is assumed that one user can have multiple accounts. 

## Local-First Design

The Safely Sync protocol is **local-first**. It means that client data is source of truth, and server acts only as an
intermediate relay between user devices. Synchronization process in this context is a process of merging changes to the 
storage between devices locally on the user device.

To meet specifics of the protocol, SlotTree storage was implemented. SlotTree is a CRDT storage that allows to merge 
changes from multiple devices without conflicts. SlotTree is designed to have undeletable history and versioning. More
about SlotTree read in TODO.

## End-to-End Encryption

The protocol is **end-to-end encrypted**. It means that **all** user data is encrypted before uploading to the server.
Data is encrypted as a single ciphertext, so server cannot make assumptions about inner structure of the storage.

Data is encrypted using shared key `SyncKey` derived from the `MasterKey`. `MasterKey` is generated once when creating 
account, and then shared with other devices using Onboarding flow. Neither `SyncKey` nor `MasterKey` are ever revealed
as plaintext to the user, network or the server.

## Real-time Synchronization

The protocol is designed to be **real-time**. It means that when a device makes a change to the storage, it is 
immediately uploaded to the server and other devices are notified about the change. No manual interaction from the user
is required to synchronize the storage between devices.

# **1. Key Hierarchy & Cryptography**

The system utilizes a hierarchical key structure.

### **1.1. The Master Key**

- **Definition:** The root key shared across all user devices. Every other key that must be shared between devices
  MUST be derived from the `MasterKey`. It is generated once upon account creation and is never rotated. It is 
  transferred to new devices via Onboarding flow.
- **Format**: 32 bytes.
- **Usage:** Exclusively used to derive child keys (`Sync Key`, `Vault Key`). It MUST NOT be used directly for 
  encryption or signing.

### **1.2. Derived Keys**

Child keys are derived from the Master Key.

- **Sync Key:**
    - **Definition:** A key used for encrypting and decrypting transmitted data between devices and the server.
    - **Format:** 32-byte key.
    - **Usage:** Encrypts synchronization data sent via the server using **XChaCha20-Poly1305**.
    - **Derivation:** `SyncKey = HKDF(MasterKey, "safely/sync/v1/sync-key", 32)`
- **Vault Key:**
    - **Definition:** A key used for encrypting and decrypting high-value secrets.
    - **Format:** 32-byte key.
    - **Usage:** Encrypts sensitive secrets (specifically mnemonics) within local storage. These secrets will after
      be also encrypted with the `SyncKey` for transmission to the server. Reasoning for double encryption is to
      ensure that sensitive `VaultKey` is locked under user-presence flag and is accessed only by the user, while 
      operational `SyncKey` is used for server communication and can be accessed without user presence.
    - **Derivation:** `VaultKey = HKDF(MasterKey, "safely/sync/v1/vault-key", 32)`
- **Device Management Key (DMK):**
    - **Definition:** A key used for signing device management operations, such as adding or removing devices.
    - **Format:** Ed25519 key pair.
    - **Usage:** Signs device management operations (add/revoke device operations). Signatures are used by the server 
      and the clients to verify that the new device is added by the owner of the account.
    - **Derivation:**
      ```
      DeviceMgmtSeed = HKDF(MasterKey, "safely/sync/v1/dmk-seed", 32)
      (dmk_sk, dmk_pk) = Ed25519_KeypairFromSeed(DeviceMgmtSeed)
      ```
- **Client-derived MasterKey keys:**
    - **Definition:** A public account API that lets clients derive additional account-scoped 32-byte keys from
      `MasterKey` without exposing the `MasterKey` itself.
    - **Format:** Client-defined.
    - **Usage:** Used by client features that need stable account keys outside the core sync protocol. Each feature
      MUST use a unique derivation domain. Specific derivations are implementation-defined.
    - **Derivation:**
      ```
      Input:
        - domain: UTF-8 string, unique to the feature requesting a derived key
      Derivation:
        DerivedKey(domain) = HKDF( 
          ikm  = MasterKey,
          salt = empty,
          info = "safely/sync/v1/derived-from-master/" || domain,
          L    = 32
        )
      ```


### **1.3. Identity Key**

- **Definition:** A unique Ed25519 keypair defining specific device.
- **Format:** Ed25519 key pair.
- **Usage:** Authorizing API calls. Private key MUST NOT leave the device.

### **1.4. Key Storage Policies**

- **Sensitive (MasterKey, VaultKey, DMK):** Stored in the Keychain or comparable secure storage. Before accessing 
  these keys, the client application MUST request explicit user approval using appropriate user-presence check.
- **Operational (SyncKey, IdentityKey)**: Stored in the Keychain or comparable secure storage and accessible to the 
  application without user interaction, because they are required for background synchronization and authenticated API 
  communication.
- **Account data key:** A client-derived MasterKey key (section 1.2, domain `account-data-key`) that encrypts data in
  synchronized state that the application must read without user interaction, with the payload format of section 4.2.
  Every device of the account derives the same key, so data encrypted on one device opens on another. A device derives
  it while the MasterKey is already unlocked when it creates the account; a device that holds the account without it
  (onboarding, or an account created before the key existed) derives it once without a user-presence check. The key is
  then cached in operational storage, inside the account's own storage node, so deleting the account removes it. It is
  an operational key: it MUST NOT protect anything that can move funds or authorize account operations. Today it
  encrypts the Flame view key.

User presence MUST be enforced by the client application and is not an access-control property of the stored Keychain
item. Therefore, the operating system does not independently prevent a malfunctioning or malicious client from
accessing these keys after obtaining access to the application's Keychain storage.

This is intentional, as Keychain-level user-presence enforcement creates problems for application UI/UX. Specific
issues are out of scope of this specification.

### **1.5. Account ID**

- **Definition:** A stable, unique identifier for the account.
- **Usage:** Used as a stable account handle so the client can distinguish different local accounts.
- **Derivation:**
    ```
    AccountID=HKDF(MasterKey, "safely/sync/v1/account-id", 16)
    ```
- **Format:** 16-byte.

---

# **2. User Flows**

### **2.0. Offline Account creation**

Offline account creation is the default first-account flow. It creates a fully usable local account without contacting
the sync server. 

1. The device generates a new 32-byte `MasterKey`.
2. The device derives `AccountID`, `SyncKey`, `VaultKey`, `DMK`.
3. The device generates a local `IdentityKey` (`IK`) Ed25519 keypair for this device.
4. The device initialized empty CRDT storage.

### **2.1. Online Account Creation**

The device operates offline initially until second device is added. To make offline account online, API endpoint
`/v1/accounts` is called. This endpoint creates new account entry on the server and registers the first server-side
device for the account.

The request includes:

```
{
  "accountId": "<AccountID>",
  "deviceManagementPubKey": "<dmk_pk>",
  "identityPubKey": "<self_IK_pk>"
}
```

### 2.2 Onboarding a New Device

To onboard a new device, the receiving device generates a QR code with its device identity, ephemeral key, and supported
storage versions. An existing device reads the QR code, adds the new device to the shared device state, syncs that state,
and publishes an encrypted onboarding message through the server. The encrypted message carries the `MasterKey` and the
sender's own `IK_pk`. The receiving device decrypts it, derives the account keys locally, and then joins the online
account.

The QR code is the out-of-band channel that protects this flow from a server-side MITM. The existing device learns the
receiver's `new_eph_pk` and `new_IK_pk` by scanning them directly from the receiving device, not from the server.

### Inputs (from QR from Receiver)

- `new_eph_pk`: receiver ephemeral X25519 public key (32 bytes)
- `new_IK_pk`: receiver permanent IK public key (Ed25519, 32 bytes)
- `storageVersion`: receiver user-storage schema version
- `devicesStorageVersion`: receiver device-list schema version

QR payload:

```
QRMessage = {
  "type": "NEW_DEVICE_ONBOARDING",
  "ephemeralPub": "<new_eph_pk>",
  "ikPub": "<new_IK_pk>",
  "storageVersion": "<storageVersion>",
  "devicesStorageVersion": "<devicesStorageVersion>"
}
```

### Sender (Existing Device)

1. Ensure that local account is online.
  - If account is not online, make account online using `/v1/accounts` endpoint.
1. Decode the QR message and read `new_eph_pk`, `new_IK_pk`, `storageVersion`, and `devicesStorageVersion`.
2. Generate `(old_eph_sk, old_eph_pk) = X25519 keypair`.
3. Compute SharedSecret:
   `SharedSecret = X25519(old_eph_sk, new_eph_pk)`
4. Derive an onboarding AEAD key:
    ```
    salt = SHA256("safely/sync/v1/onboarding-salt")
    info = "safely/sync/v1/onboarding-key" || 0x00 || old_eph_pk || new_eph_pk || new_IK_pk
    
    OnboardKey = HKDF(
        ikm  = SharedSecret,
        salt = salt,
        info = info,
        L    = 32
    )
    ```

5. Encode the onboarding message payload:
    ```
    version = 0x01
    payload = version || u16be(len(MasterKey)) || MasterKey
                      || u16be(len(old_IK_pk)) || old_IK_pk
    ```

    `old_IK_pk` is the sender's own permanent IK public key. It exists so the receiver can name the device that
    authorized it; nothing in the key derivation depends on it. The version stays `0x01` because the field is appended:
    a decoder that predates it reads `MasterKey` by its own length prefix and ignores the trailing bytes, so a sender on
    this version can still onboard a receiver on an older one. Everything after `MasterKey` is therefore optional by
    construction, and a new field is appended the same way rather than bumping the version.

6. Encrypt the payload with XChaCha20-Poly1305:
    ```
    nonce24 = random(24 bytes)
    aad = "safely/sync/v1/onboarding-aad" || 0x00 
    				|| old_eph_pk || new_eph_pk || new_IK_pk
        
    ciphertext = Encrypt_XChaCha20Poly1305(
        key   = OnboardKey,
        nonce = nonce24,
        pt    = payload,
        aad   = aad
    )
    ```

7. Sign the server onboarding operation:
    ```
      toSign = "safely/sync/v1/server/add_device" || 0x00
            || new_IK_pk

      sig = Ed25519_Sign(toSign, dmk_sk)
    ```

8. Add `new_IK_pk` to the shared device state.
9. Trigger synchronization and wait until the device-state update is synchronized.
10. Publish the encrypted onboarding message:
    ```
    POST /v1/devices/onboarding/message
    {
      "newIdentityPubKey": "<new_IK_pk>",
      "inviterEphemeralPubKey": "<old_eph_pk>",
      "ciphertext": "<ciphertext>",
      "nonce": "<nonce24>",
      "signature": "<sig>"
    }
    ```

    `signature` authorizes the server-side onboarding operation. It is not a signature for the receiver to verify.

### Receiver (New Device)

1. Poll for the onboarding message:

    ```
    GET /v1/devices/onboarding/message
    ```

    The response contains `newIdentityPubKey`, `inviterEphemeralPubKey`, `ciphertext`, `nonce`, and `signature`.
2. Verify that `newIdentityPubKey` equals `new_IK_pk` and set `old_eph_pk = inviterEphemeralPubKey`.
3. Compute SharedSecret:
   `SharedSecret = X25519(new_eph_sk, old_eph_pk)`
4. Derive `OnboardKey` with the same HKDF parameters as the sender.
5. Decrypt and decode the onboarding payload using `OnboardKey`, `nonce`, `ciphertext`, and the same AAD:
    ```
    aad = "safely/sync/v1/onboarding-aad" || 0x00
        || old_eph_pk || new_eph_pk || new_IK_pk
    payload = Decrypt_XChaCha20Poly1305(OnboardKey, nonce, ciphertext, aad)
    payload = 0x01 || u16be(len(MasterKey)) || MasterKey
                   || u16be(len(old_IK_pk)) || old_IK_pk
    ```

    `old_IK_pk` is absent when the sender predates it, and the receiver treats it as unknown rather than as an error.
    It is a claim, not a proof: `OnboardKey` is derived from the ephemeral exchange only, so the payload authenticates
    whoever scanned the QR code and not a particular identity. Whoever scanned it holds `MasterKey` already, so the only
    thing a wrong value buys is a wrong label; the receiver limits even that by using `old_IK_pk` solely to look a device
    up in the shared device state, which it learns over sync and not from this message.

6. Create an online local account from `MasterKey` and the receiver-generated `IK`. The device derives account keys from
   `MasterKey` locally; no other private keys are transferred.
7. Confirm onboarding:
    ```
    POST /v1/devices/onboarding/confirm
    ```

8. Start the online sync provider and wait until the account is synchronized. During sync, the device observes its own
   `IK` in the shared device state and activates the local device record.

### 2.2.1 Reconnect Onboarding

Reconnect onboarding is used when a device already has local account data and its original `IdentityKey`, but that
device is no longer authorized in the shared device state. This can happen after self device deletion or remote device
revocation. Reconnect onboarding does not transfer `MasterKey` or any other account secret. It only lets an active
device re-authorize an existing device identity that already belongs to the account.

### Inputs (from QR from Reconnecting Device)

- `reconnecting_IK_pk`: reconnecting device permanent IK public key (Ed25519, 32 bytes)
- `storageVersion`: reconnecting device user-storage schema version
- `devicesStorageVersion`: reconnecting device device-list schema version

QR payload:

```
QRMessage = {
  "type": "RECONNECTION",
  "ikPub": "<reconnecting_IK_pk>",
  "storageVersion": "<storageVersion>",
  "devicesStorageVersion": "<devicesStorageVersion>"
}
```

### Authorizing Device

1. Decode the QR message and read `reconnecting_IK_pk`, `storageVersion`, and `devicesStorageVersion`.
2. Verify that `reconnecting_IK_pk` belongs to this account as a revoked device. If the key is unknown, the request is
   treated as a reconnect attempt from another account and MUST be rejected. If the device is already active or pending
   activation, the request MUST also be rejected.
3. Authorize the reconnecting device on the server by calling `POST /v1/devices`.
4. Add `reconnecting_IK_pk` back to the shared device state as an added device. 
5. Store the reconnecting device storage versions if they are supported by the authorizing device.
6. Trigger synchronization and wait until the updated device state is visible.

### Reconnecting Device

1. Generate the reconnect QR payload using the existing local `IK`. No new account keys are generated and no account
   secrets are requested from the authorizing device.
2. Wait for the authorizing device to scan the QR code and publish the updated device state.
3. Restart online synchronization attempts until the device receives a synchronized snapshot that contains its own `IK`
   in the shared device state.
4. When the reconnecting device observes itself in the shared device state, it activates the local device record and
   resumes normal sync participation.

### **2.3. Device Management**

Device management controls which device identity keys are authorized to participate in the account. A device is valid
only if it is present in the shared device state and has not been revoked by a DMK-signed device-management operation.

### **2.3.1. Self Device Deletion**

Self device deletion is used when the user removes the current device from an account. The goal is to stop this device
from participating in future synchronization while making the revocation visible to the remaining devices.

For an online account:

1. The client creates a DMK-signed revocation for its own `IK` and applies it to the shared device state.
    ```
    toSign = "safely/sync/v1/device/revoke" || 0x00
          || self_IK_pk
    storage_sig = Ed25519_Sign(toSign, dmk_sk)
    ```
2. The client uploads a new encrypted snapshot containing the revocation, so other devices can observe that this device
   has been removed.
3. The client asks the server to remove the same `IK` from the server-side account device list. This request is
   authorized by a DMK signature over the revoked device identity.
    ```
    toSign = "safely/sync/v1/server/revoke_device" || 0x00
          || self_IK_pk
    server_sig = Ed25519_Sign(toSign, dmk_sk)
    ```

4. The client deletes local account data and locally stored account keys from this device.

Snapshot uploading and server-side device removal are performed if the server is reachable, but if it is not reachable,
those remote steps are skipped and the client still performs local cleanup.

For an offline account, no server account exists yet, so self device deletion is only local cleanup of account state and
keys.

### **2.3.2. Remote Device Revocation**

Remote device revocation is used when an active device removes another device from the account. This operation 
**does not** remove the revoked device's local account data or keys, The only purpose of this operation is to 
clear device list from unused devices. If the device is lost or stolen, threat model is considered lost 
(see Threat Model section) and the user should create a new account instead of revoking the lost device.

1. The client creates a DMK-signed revocation for the target `IK` and applies it to the shared device state.
    ```
    toSign = "safely/sync/v1/device/revoke" || 0x00
          || target_IK_pk
    storage_sig = Ed25519_Sign(toSign, dmk_sk)
    ```
2. The target `IK` is removed from the set of CRDT authors allowed to write future account updates.
3. The client triggers synchronization so the revocation is published to the server and becomes visible to other active
   devices.
4. The client asks the server to remove the target `IK` from the server-side account device list. This request is
   authorized by a DMK signature over the revoked device identity.
    ```
    toSign = "safely/sync/v1/server/revoke_device" || 0x00
          || target_IK_pk
    server_sig = Ed25519_Sign(toSign, dmk_sk)
    ```

---

# **3. Storage**

Synced storage is using SlotTree. There are two separate storages: one for user-defined data, and the other is for
protocol metadata.

### **3.1. User Storage**

User storage is separated and is used for storing client-defined data. Its structure is defined by the client.

### **3.2 Local Device List**

There are two device lists in the system:

- **Local device list:** encrypted, synced device state stored inside protocol metadata. It is the protocol source of
  truth for device lifecycle (`added`, `active`, `revoked`) and is validated by clients using DMK signatures.
- **Server device list:** server-side allowlist of device `IK` public keys. It is used only for API usage.

This section describes the local synced device list.

Each entry has the following properties:

- `kid`: stable device-list key derived from the device identity key
- `type`: device state:
    - `active`: the device is authorized to sync and author CRDT updates.
    - `added`: the device has been added to the account but is not activated locally yet.
    - `revoked`: the device was removed from the account.
- `ikPub`: 32-byte hex-encoded Ed25519 identity public key of the device.
- `addedAt`: local timestamp from the add-device operation. Present only for `active` and `added` entries.
- `sign`: 64-byte hex-encoded DMK signature authorizing the device-list entry.

`addedAt` exists on `active` devices solely for UX purpose. It is not used for protocol logic. `revoked` status is not
shown in the UX, so `addedAt` is not present for revoked devices.

#### 3.2.1 Device Lifecycle

Device entries move through the following lifecycle:

```
added -> active -> revoked
```

**`added`**

A device enters the device list as `added` when another active device authorizes it through new-device onboarding or
reconnect onboarding. At this point the device is present in the shared device state, but it is not considered fully
active locally yet.

`added` entries that never become active are temporary. Clients MAY delete stale `added` entries after the onboarding
window expires.

**`active`**

A device becomes `active` only on the device itself. During sync, the device first merges the shared device list from the
received snapshot. If the device finds its own `IK` in the `added` state, and it has not been revoked, it locally changes
that entry to `active`. This operation does not require separate DMK signature.

**`revoked`**

A device becomes `revoked` when an active device applies a DMK-signed revoke operation for that device `IK`. Revocation
replaces the previous `added` or `active` entry with a revoked entry containing the same `ikPub` and a revoke signature.

The device has been removed from normal protocol participation. The server MUST reject future API operations and CRDT 
updates attributed to that device.

Revocation does not invalidate account keys already stored by the revoked device and is not a cryptographic security 
boundary. A malicious revoked device retaining SyncKey and its IdentityKey may still construct cryptographically valid 
snapshots. Protection against such a device is out of scope; a lost or compromised device requires migration to a new 
account.

#### 3.2.2 Device List Signatures

Active and added devices are signed as:
```
toSign = "safely/sync/v1/device/add" || 0x00
      || IK_pub
      || u64be(addedAt)
sign = Ed25519_Sign(toSign, dmk_sk)
```

Revoked devices are signed as:
```
toSign = "safely/sync/v1/device/revoke" || 0x00
      || IK_pub
sign = Ed25519_Sign(toSign, dmk_sk)
```

Clients MUST verify the DMK signature of every device-list entry received from sync before applying it. The active
device set is the subset of entries with `type = "active"`.

---

# **4. Sync Process**

Sync is snapshot-based. Each device keeps local SlotTree state for user data and protocol metadata. When a device needs
to publish its state, it encodes the current SlotTree snapshots into one sync payload, encrypts that payload with
`SyncKey`, and uploads the encrypted snapshot to the server.

The server is an untrusted relay and storage layer. It stores encrypted snapshots and metadata, but it cannot read the
snapshot contents without `SyncKey`. Any other authorized device in the same account can later fetch or receive the
encrypted snapshot from the server, decrypt it locally with the same `SyncKey`, and apply the decoded SlotTree snapshots
to its local storage.

### **4.1. Snapshot Encryption and Decryption**

Snapshot plaintext contains both synchronized storage domains:

```
payload = CBOR({
  "userStorage": SlotTreeSnapshot(userStorage),
  "deviceStorage": SlotTreeSnapshot(deviceStorage)
})
```

The publishing device encrypts the payload with `SyncKey`:

```
nonce24 = random(24 bytes)
ciphertext = Encrypt_XChaCha20Poly1305(
  key   = SyncKey,
  nonce = nonce24,
  pt    = payload
)
```

The device then creates snapshot metadata:

```
if previousSnapshotProof is empty:
  snapshotProof = SHA256(ciphertext)
else:
  snapshotProof = SHA256(previousSnapshotProof || SHA256(ciphertext))

toSign = nonce24 || ciphertext || snapshotProof
signature = Ed25519_Sign(toSign, IK_sk)
```

Snapshot signatures are technically present in the snapshot format and are produced by the publishing device. In the
current scheme they are not treated as an enforced security boundary and are not verified during snapshot application.
There is no meaningful additional security from this check in the current threat model: a party that can produce valid
snapshot signatures with an account device `IK` already has the operational capability needed to read and write synced
account data. Snapshot integrity is instead provided by `SyncKey` encryption.

The encrypted snapshot is sent to the server:

```
POST /v1/snapshots
{
  "kid": "<author device KID>",
  "nonce": "<nonce24>",
  "ciphertext": "<ciphertext>",
  "snapshotProof": "<snapshotProof>",
  "signature": "<signature>"
}
```

When another device receives the snapshot, it decrypts and applies it locally:

```
payload = Decrypt_XChaCha20Poly1305(
  key        = SyncKey,
  nonce      = nonce24,
  ciphertext = ciphertext
)

decoded = CBOR_Decode(payload)
ApplySlotTreeSnapshot(userStorage, decoded.userStorage)
ApplySlotTreeSnapshot(deviceStorage, decoded.deviceStorage)
```

If decryption or payload decoding fails, the snapshot MUST be rejected and not applied.

### 4.2. Mnemonic Encryption

Mnemonics in the storage must be encrypted using the following algorithm:

```
plaintext = utf8(mnemonic)

nonce24 = random(24 bytes)
ciphertext = Encrypt_XChaCha20Poly1305(
  key   = VaultKey,
  nonce = nonce24,
  pt    = plaintext
)

encryptedPayload = hex(0x01 || nonce24 || ciphertext)
```

To decrypt a mnemonic:

```
data = hex_decode(encryptedPayload)
version = data[0]
assert version == 0x01

nonce24 = data[1..25]
ciphertext = data[25..]

plaintext = Decrypt_XChaCha20Poly1305(
  key        = VaultKey,
  nonce      = nonce24,
  ciphertext = ciphertext
)

mnemonic = utf8_decode(plaintext)
```

### **4.3. Snapshot Proofs**

`snapshotProof` is primarily a server-side synchronization guard. It lets the server check that the uploading client was
based on the current server head when it created a new snapshot. This prevents a stale client from overwriting the latest
server snapshot without first syncing and merging the current head.

Every `POST /v1/snapshots` request MUST include `snapshotProof`. The server computes the expected proof from its current
head and the uploaded snapshot ciphertext. If the uploaded proof is not a child of the current server proof, the server
rejects the snapshot.

Snapshot proof calculation:

```
ciphertextHash = SHA256(ciphertext)

if parentSnapshotProof is empty:
  snapshotProof = ciphertextHash
else:
  snapshotProof = SHA256(parentSnapshotProof || ciphertextHash)
```

Server-side validation:

```
parentSnapshotProof = current server snapshot proof, or empty for the first snapshot
expectedProof = CalculateSnapshotProof(parentSnapshotProof, ciphertext)

assert uploadedSnapshotProof == expectedProof
```

This proof does not make snapshot contents semantically fresh. A malicious client that has both `SyncKey` and a valid
`IdentityKey` could decrypt an old snapshot, re-encrypt it, and upload it with a fresh proof. There is no reasonable
cryptographic defense against that inside this protocol: possession of the keys means the account is already
compromised.

A client can ask the server for a proof chain from its last known proof to the current server head and verify that the
server only returned newer snapshots. In the current implementation this is not a meaningful safety boundary, because
SlotTree keeps history permanently and has no operation that deletes that history; merging an old snapshot into a newer
local state therefore cannot delete already-known data. If this property changes in the future, the client can start
enforcing proof-chain verification.

---

# **5. Server**

This section contains vital endpoints that are required for the current specification. More endpoints may be added by 
the implementation.

### **5.1. Authorization Header**

All requests must be signed by the device's IK.

**Header Format:**

```
Authorization: ED25519 pub=<hex 32-byte>,nonce=<u32>,timestamp=<unix_seconds>,sig=<hex 64-byte signature>
```

**Payload Construction for Signature:**
The signature is calculated over the concatenation of:

```
Inputs:
  - method: uppercase ASCII (e.g. "POST")
  - path_with_query: ASCII as sent on the wire without `api` (e.g. "/v1/add_update?x=1")
  - body_string: request body in the raw string format
  - timestamp: unix seconds (u64)
  - nonce: u32 (per IK)

Body bytes:
  body_bytes = UTF8(body_string)
  body_hash  = SHA256(body_bytes)

Framing:
  toSign = "safely/sync/v1/http-auth" || 0x00
        || u16be(len(method))         || method_bytes
        || u16be(len(path_with_query))|| path_bytes
        || body_hash
        || u64be(timestamp)
        || u32be(nonce)

Signature:
  sig = Ed25519_Sign(toSign, IK_sk)
```

Example:

```
utf8("safely/sync/v1/http-auth") || 0x00 ||
u16be(4)  ++ utf8("POST") ++
u16be(15) ++ utf8("/api/add_update") ++
hex("6fb9d0142a1fdf17fcaa7ecaa93c91d202fc7c86f74b1791edec15b790ded3d5") ++
u64be(1763016068) ++
u32be(5)
```

### **5.2. Server Validation Logic**

Upon receiving a request, the server must:

1. Check if the `pub` (IK) is registered.
   - For `POST /v1/accounts` endpoint, this step MUST be skipped.
   - For `GET /v1/devices/onboarding/message` and `POST /v1/devices/onboarding/confirm` endpoints, check onboarding
     messages instead.
2. Check that the `nonce` has not been used in the last N minutes (requires a cache of nonces).
3. Verify `timestamp + TTL > current_server_time`.
4. Validate the Ed25519 signature against the payload.

### **5.3. Snapshot Handling**

- The server must validate the `snapshotProof` logic upon receipt.
- If the proof is invalid, return a specific error indicating a `SnapshotProof` mismatch.

### 5.4. Snapshot SSE Stream

The snapshot stream is used for live delivery of newly uploaded encrypted snapshots to already synchronized devices.

```
GET /v1/snapshots/stream
Accept: text/event-stream
Last-Event-ID: <local_snapshot_proof_hex>
Authorization: <IK HTTP auth signature>
```

The request is authorized like any other server request.

Server behavior:

1. Find the account by the requester's `IK`.
2. Open an SSE response with `Content-Type: text/event-stream`.
3. When a new snapshot is accepted through `POST /v1/snapshots`, publish it to subscribers of the same account.
4. Each snapshot event contains the encrypted snapshot metadata and payload:
    ```
    event: snapshot
    id: <snapshotProof>
    data: {
      "kid": "<author_device_kid>",
      "ciphertext": "<ciphertext>",
      "nonce": "<nonce24>",
      "signature": "<IK signature>",
      "snapshotProof": "<snapshotProof>"
    }
    ```

### 5.5. Server Device List

The server keeps a separate account device list containing the `IK` public keys that are allowed to make authenticated
API requests for that account.

### 5.6. Add/Revoke device

Upon receiving a request, the server must verify DMK authorization signature before adding or revoking a device.

`POST /v1/devices` adds an `IK` to the server device list. `POST /v1/devices/remove` removes an `IK` from the server
device list.

### 5.7. Onboarding

The server stores encrypted onboarding messages while a new device is waiting to join an account. The server does not
decrypt or interpret the message payload; it only routes the message to the device identified by `newIdentityPubKey`.

#### 5.7.1. Publish onboarding message

An already authorized device publishes the encrypted onboarding message for a new device:

```
POST /v1/devices/onboarding/message
{
  "newIdentityPubKey": "<new_IK_pk>",
  "inviterEphemeralPubKey": "<old_eph_pk>",
  "ciphertext": "<ciphertext>",
  "nonce": "<nonce24>",
  "signature": "<DMK signature>"
}
```

Server behavior:

1. Find the account by the requester's `IK`.
2. Verify `signature` as a DMK signature authorizing `newIdentityPubKey`:
    ```
    toSign = "safely/sync/v1/server/add_device" || 0x00
          || new_IK_pk

    valid = Ed25519_Verify(signature, toSign, dmk_pk)
    ```

3. Replace any existing pending onboarding message for `newIdentityPubKey`.
4. Store the new onboarding message.

#### 5.7.2. Fetch onboarding message

The new device polls for an onboarding message:

```
GET /v1/devices/onboarding/message
```

Server behavior:

1. Find a pending onboarding message where `newIdentityPubKey` equals the requester's `IK`.
2. Return the message if it exists.
3. Return an error if no message exists.

#### 5.7.3. Confirm onboarding

After the new device decrypts the onboarding message and initializes the account locally, it confirms onboarding:

```
POST /v1/devices/onboarding/confirm
```

Server behavior:

1. Find an account with a pending onboarding message where `newIdentityPubKey` equals the requester's `IK`.
2. Add the requester's `IK` to the server-side account device list.
3. Remove the pending onboarding message for that `IK`.
4. Return an error if no pending onboarding message exists.
