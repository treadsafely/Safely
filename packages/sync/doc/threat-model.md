# Sync Threat Model

## 1. Purpose and Scope

This document describes the threat model for the multi-device encrypted synchronization protocol.

The protocol allows one account owner to use the same account on multiple devices. Devices synchronize encrypted user 
data and protocol metadata through a remote server.

The primary security goals are:

- synchronized plaintext must remain confidential from the server and network attackers;
- user-related sensitive secrets must receive additional protection;
- unauthorized parties that do not possess account keys must not be able to construct valid account snapshots;
- onboarding must transfer account data only to a device explicitly approved by the user.

### 1.1. System Assumptions

The threat model makes the following assumptions:

- an account belongs to exactly one stakeholder;
- an account may be used from multiple devices;
- devices may temporarily be out of sync;
- an attacker may observe, intercept, modify, delay, replay, or suppress network traffic;
- the synchronization server may be compromised or intentionally malicious.

### 1.2. Usability Constraint

Security controls must not unreasonably disrupt the user experience. The protocol therefore accepts some risks that 
could only be eliminated through additional user interactions.

### 1.3. Risk Response Terms

The following terms are used throughout this document:

- **Eliminate:** the protocol prevents the threat under the stated assumptions.
- **Reduce:** the protocol lowers the likelihood or impact of the threat but does not fully prevent it.
- **Accept:** the threat is intentionally not mitigated or is outside the current security scope.

Residual risk ratings are qualitative:

- **Low:** exploitation generally requires breaking a cryptographic assumption, bypassing platform security, or 
  exploiting an implementation defect.
- **Medium:** exploitation is plausible under the stated threat model but has limited scope or requires additional 
  conditions.
- **High:** exploitation can directly compromise account security under a scenario explicitly accepted by the protocol.

### 1.4. Out of Scope

The following properties are outside the current threat model:

- post-compromise security;
- perfect forward secrecy;
- protection against a rooted, jailbroken, or otherwise fully compromised operating system;
- snapshot freshness, global consistency, and availability against a malicious server;
- prevention of destructive but structurally valid updates produced by an authorized or compromised client.

---

## 2. Assets and Data Classification

The protocol distinguishes between sensitive data and operational data.

### 2.1. Sensitive Data

Sensitive data can directly provide access to user assets or authorize security-critical account operations.

Sensitive data includes:

- `MasterKey`;
- `VaultKey`;
- Device Management Key (`DMK`);
- user-related sensitive secrets, such as wallet mnemonics.

All sensitive keys are stored in the Keychain or comparable platform secure storage.

The legitimate client requests explicit user approval, such as biometric or device-credential confirmation, before 
using sensitive keys for sensitive operations.

This approval requirement is implemented by application logic rather than by an OS-enforced Keychain access-control 
policy. It is therefore a UX and application-level authorization mechanism, not a security boundary against malicious 
client code.

User-related sensitive secrets are encrypted with `VaultKey` before being stored in synchronized storage. They are 
subsequently encrypted again as part of the complete snapshot using `SyncKey`.

Consequently:

- access to `SyncKey` alone does not reveal the plaintext of `VaultKey`-protected secrets;
- access to `VaultKey` allows sensitive secrets to be decrypted when their encrypted payloads are available.

### 2.2. Operational Data

Operational data must be accessible to the application during normal background synchronization and API communication.

Operational data includes:

- `SyncKey`;
- the device `IdentityKey` private key;
- synchronized account metadata protected by `SyncKey`;
- protocol metadata used for device and synchronization state;
- the cached account data key (spec section 1.4).

Data encrypted with the account data key is readable on every device without user interaction. Today that is the
Flame view key, which decrypts the amounts and memos of the user's Flame notes but cannot spend them. It is stored in
synchronized state encrypted with the account data key, so a copy of local application storage or of a
snapshot without the operational Keychain items does not reveal it.

`SyncKey` and the device `IdentityKey` private key cannot require an interactive user-approval check for every use 
because they are part of the real-time synchronization protocol.

They are stored in the Keychain or comparable platform storage but remain available to the application without explicit 
user interaction.

---

## 3. Key-Compromise Model

### 3.1. Operational Key Compromise Assumption

`SyncKey` and the device `IdentityKey` private key are both operational keys. They are accessible to the same 
application and are protected by substantially the same platform security boundary.

The threat model therefore does not treat compromise of only one operational key as a separate realistic attack
scenario.

An attacker capable of extracting an operational key from the application process, application storage, or OS key 
storage is assumed to be capable of extracting both the device `IdentityKey` and `SyncKey`.

Compromise of a device's operational keys allows the attacker to:

- authenticate server API requests as that device while the device remains accepted by the server;
- construct cryptographically valid encrypted snapshots;
- modify synchronized state and encrypted Vault payloads.

Operational-key compromise does not by itself reveal the plaintext of `VaultKey`-encrypted secrets. It does reveal
everything encrypted with the account data key, today the Flame view key and with it the amounts and memos of the
user's Flame notes, because the account data key is cached next to `SyncKey`.

Protection against malicious updates produced by a device whose operational keys are compromised is outside the current 
threat model.

### 3.2. VaultKey Compromise

Compromise of `VaultKey` allows an attacker to decrypt user-related sensitive secrets when the corresponding encrypted 
payloads are available.

### 3.3. Device Management Key Compromise

Compromise of `DMK` allows an attacker to create valid device-management authorizations, including add-device and 
revoke-device operations.

The practical impact also depends on whether the attacker can publish the operation through an authorized device or a 
cooperating server.

### 3.4. MasterKey Compromise

Compromise of `MasterKey` is considered a full account compromise: an attacker with `MasterKey` can derive all account 
keys.

The current protocol does not provide account-key rotation or post-compromise recovery. The user must create a new 
account and migrate data through trusted devices.

---

## 4. Trust Boundaries

### 4.1. Client Application

The legitimate client is trusted to:

- request user approval before sensitive operations;
- use account keys only for their specified purposes;
- validate decrypted snapshots before applying them to local storage;
- correctly apply SlotTree merge rules.

A malicious or malfunctioning client may violate these requirements. Protection against such behavior is limited to 
development process.

### 4.2. Synchronization Server

The server is an untrusted relay. Client must not trust any server-provided data.

The server-side device allowlist and `snapshotProof` are operational controls used during normal server operation. 
They reduce conflicts and unauthorized API use when the server behaves correctly, but client is not considering them
as security boundary.

---

## 5. Security Limitations

### 5.1. Device Revocation

Device revocation is not a cryptographic revocation mechanism.

A device that retains account keys after revocation remains capable of receiving and producing valid encrypted 
snapshots, reading wallet secrets, and performing other account operations.

A lost, stolen, or compromised device must be treated as an account compromise. The user must create a new account and 
migrate data instead of relying on device revocation.

### 5.2. Snapshot Signatures

Snapshot signatures remain part of the snapshot format as legacy, but clients do not verify them when applying 
snapshots.

Under the operational-key compromise assumption, an attacker capable of obtaining `SyncKey` is also assumed capable of 
obtaining the device `IdentityKey`. Therefore, verifying snapshot signatures does not provide an additional security 
boundary.

### 5.3. Snapshot Freshness and Global Consistency

The protocol does not provide a trusted global checkpoint that a newly onboarded device can use to prove that the 
server returned the latest account state.

An already synchronized device can reject the practical effects of an older snapshot when SlotTree already contains 
the newer snapshot. A new or restored device may temporarily accept an older valid snapshot because it has no newer 
trusted local state.

These conditions are treated as synchronization freshness and availability failures rather than confidentiality or 
cryptographic-integrity failures.

---

## 6. General Threats

### Threat G1: A malicious or malfunctioning client may access sensitive keys without user approval

#### Description

A malicious or malfunctioning client with access to the application's Keychain items may bypass the approval flow and 
access sensitive keys directly.

#### Response [Accept]

**Residual risk:** High. Compromised client code may access all locally stored account keys and sensitive secrets 
without explicit user approval.

### Threat G2: A malfunctioning client may corrupt synchronized storage

#### Description

A client containing implementation defects may produce a structurally invalid snapshot or a structurally valid update 
that unintentionally deletes or corrupts user data.

#### Response [Reduce + Accept]

XChaCha20-Poly1305 detects unauthorized modification of encrypted snapshot bytes.

After decryption, SlotTree validates the decoded snapshot structure and rejects snapshots that violate the expected 
storage representation.

These mechanisms prevent malformed serialized data from being silently applied.

They do not prevent a client possessing valid account keys from producing a structurally valid but semantically 
destructive update, such as replacing or deleting a wallet-secret entry.

**Residual risk:** Medium. A correctly implemented client rejects structurally invalid snapshots, but a client defect 
may still produce a valid destructive account update.

### Threat G3: A sufficiently capable quantum computer may break asymmetric cryptography

#### Description

A sufficiently capable quantum computer could threaten X25519.

#### Response [Accept]

The current protocol does not use post-quantum cryptography.

Migration to post-quantum algorithms is outside the current scope because a quantum computer capable of attacking the 
deployed asymmetric primitives is not considered a realistic threat.

**Residual risk:** Low under the current assumptions.

---

## 7. Onboarding Threats

### 7.1. Onboarding Security Goals

The onboarding flow has the following security goals:

- the network and server must not learn `MasterKey`;
- the encrypted message must be bound to the intended receiving device;
- onboarding must require an explicit user action.

### Threat O1: A malicious or malfunctioning client may initiate onboarding without legitimate user approval

#### Description

Onboarding requires access to `MasterKey`. The legitimate client requests user approval before accessing `MasterKey` 
and completing the onboarding operation.

Because the approval check is enforced by application logic rather than an OS-enforced key-access policy, modified or 
malfunctioning client code may bypass it.

#### Response [Reduce + Accept]

The legitimate onboarding UI prevents accidental onboarding from an unlocked device. It also requires physical 
interaction with the authorizing device and a QR scan.

These controls do not protect against malicious client code that can directly access `MasterKey`.

**Residual risk:** High. A compromised client that can access sensitive Keychain items may onboard another device 
without completing the legitimate approval flow.

### Threat O2: The user may scan a malicious onboarding QR code

#### Description

Scanning an onboarding QR code authorizes the receiving device to obtain `MasterKey` and therefore grants full access 
to the account.

The protocol cannot determine whether the physical device displaying the QR code is trusted by the user.

#### Response [Reduce + Accept]

The following UX controls reduce accidental authorization:

- the user must physically initiate the onboarding flow on the existing device;
- onboarding uses a dedicated QR scanner that is not reused for unrelated application actions;
- the UI must clearly state that scanning the code grants full account access to the receiving device.

The QR code remains the out-of-band trust decision. The user is responsible for scanning a code only from a trusted 
device.

**Residual risk:** High. A malicious receiving device approved by the user receives full account access.

### Threat O3: The server or a network attacker may intercept `MasterKey` during onboarding

#### Description

The onboarding message passes through an untrusted network and server.

#### Response [Eliminate]

The receiving device generates an ephemeral X25519 key pair and transfers its public key to the existing device through 
the QR code.

The existing device generates its own ephemeral X25519 key pair and derives an onboarding key from the resulting shared 
secret.

The onboarding key derivation and AEAD associated data bind the encrypted message to:

- the inviter's ephemeral public key;
- the receiver's ephemeral public key;
- the receiver's permanent `IdentityKey`.

`MasterKey` is encrypted using XChaCha20-Poly1305 before being sent through the server.

A network attacker or server that does not possess either ephemeral private key cannot derive the onboarding encryption 
key or decrypt `MasterKey`.

**Residual risk:** Low, assuming correct implementation.

### Threat O4: A malicious server may store, replace, delay, or replay an onboarding message

#### Description

A malicious server may store, replace, delay, or replay an onboarding message.

#### Response [Reduce]

The encrypted onboarding message is bound to the receiving device's:

- ephemeral X25519 key;
- permanent `IdentityKey`.

The receiving device deletes its ephemeral onboarding private key after successful onboarding, cancellation, or 
expiration of the onboarding session. Once the ephemeral private key is deleted, the replayed ciphertext can no longer 
be decrypted.

The server may still suppress or indefinitely delay the onboarding message. This is an availability failure and is 
outside the current threat model.

**Residual risk:** Low.

---

## 8. Device-Management Threats

### Threat D1: A revoked device may retain account keys and continue accessing account data

#### Description

Revocation does not erase account keys already stored on the device.

A revoked device may retain all the account keys.

It therefore remains cryptographically capable of reading or producing account data if it can continue communicating 
with the server or obtain encrypted snapshots through another channel.

A correctly behaving server blocks the revoked `IdentityKey` from normal API access. A malicious or compromised server 
may ignore the allowlist and continue exchanging snapshots with the revoked device.

#### Response [Accept]

The protocol does not provide cryptographic device revocation.

Remote revocation is intended to remove an unused or intentionally disconnected device from normal protocol 
participation. It is not intended to recover security after a device has been lost, stolen, or compromised.

The user must create a new account and migrate trusted data when a device containing account keys is lost or 
compromised.

**Residual risk:** High. A revoked device retaining account keys may continue reading account data.

---

## 9. Server Threats

### Threat S1: The server or a network attacker may gain access to snapshot plaintext

#### Description

The server stores and transports account snapshots and may observe all synchronization traffic.

#### Response [Eliminate]

Each account has a 32-byte `SyncKey` derived from `MasterKey`.

Complete synchronization payloads are encrypted using XChaCha20-Poly1305 with a random 24-byte nonce before they are 
uploaded to the server. An attacker that does not possess `SyncKey` cannot decrypt snapshots.

`MasterKey` and `SyncKey` are never sent to the server in plaintext.

**Residual risk:** Low, assuming correct implementation.

### Threat S2: A malicious server may replay, delay, suppress, or fork synchronized state

#### Description

A malicious server may:

- return an older valid encrypted snapshot;
- present different valid snapshots to different devices;
- delay delivery of a snapshot;
- suppress snapshots indefinitely;
- stop accepting new snapshots;
- ignore the server-side device allowlist;
- ignore or rewrite the server-side `snapshotProof` chain.

#### Response [Accept]

All synchronized user data and protocol metadata are encoded into one encrypted snapshot payload.

The server cannot:

- decrypt the snapshot;
- create a new valid snapshot without `SyncKey`;
- perform a content-based rollback.

The server may choose among complete ciphertexts based on observable properties such as timing, size, source device, or 
delivery history.

An older snapshot does not remove newer SlotTree state already known to an up-to-date device. Applying such a 
snapshot is expected to result in a no-op.

A newly onboarded or restored device does not have a trusted latest-snapshot checkpoint. The server may therefore give
it an older valid snapshot, causing temporary stale state. Differences may become visible to the user when comparing 
devices.

The following attacks are considered availability or freshness failures and are outside the current security scope:

- temporary or permanent suppression;
- temporary or permanent forks;
- selective denial of service to a specific device.

**Residual risk:** Low for confidentiality and cryptographic snapshot integrity.

### Threat S3: The server may observe and correlate account metadata

#### Description

Snapshot encryption does not hide transport and server-side metadata.

The server may observe:

- `AccountID`;
- device `IdentityKey` public keys;
- the number of registered devices;
- device addition and removal events;
- source IP addresses;
- request timestamps;
- snapshot sizes;
- synchronization frequency;
- which devices are active at similar times.

This information may allow the server to correlate devices or infer account usage patterns without decrypting snapshot 
contents.

#### Response [Accept]

Snapshot encryption protects plaintext content but does not attempt to hide communication patterns or server-required 
routing information.

**Residual risk:** Medium. The server cannot read snapshot plaintext but may infer relationships and usage patterns 
from observable metadata.

### Threat S4: A network attacker may modify or replay authenticated API requests

#### Description

A network attacker may capture a valid signed API request and attempt to replay it to the server.

#### Response [Eliminate]

Each request is signed using the device `IdentityKey`.

The signed payload includes:

- HTTP method;
- path and query;
- request-body hash;
- timestamp;
- per-device nonce.

Modification of any signed field invalidates the Ed25519 signature.

The nonce-retention period must cover the complete request-validity window.

These controls protect against a network attacker when the server behaves correctly. They do not constrain a malicious 
server, which may ignore its own validation rules.

**Residual risk:** Low, assuming correct implementation.

---

## 10. Security Guarantees

Under the assumptions in this threat model, the protocol provides the following guarantees:

- the server and network attackers cannot decrypt synchronized snapshot contents;
- the server cannot modify, corrupt or rollback synchronized state;
- interception or modification of onboarding traffic does not grant access to private secrets;
- synchronized state can be read or modified only by trusted devices.

The protocol does not guarantee:

- protection after a trusted device has been compromised;
- protection against malicious or malfunctioning client code;
- a single globally consistent account history against a malicious server;
- availability against the server;
- prevention of semantically destructive updates produced by an authorized or compromised client.
