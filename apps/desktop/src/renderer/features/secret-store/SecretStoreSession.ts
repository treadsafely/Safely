export class SecretStoreSession {
    private coldStartPresence = false;

    public recordUnlock(isPresenceVerified: boolean): void {
        this.coldStartPresence = isPresenceVerified;
    }

    public hasColdStartPresence(): boolean {
        return this.coldStartPresence;
    }

    public clearColdStartPresence(): void {
        this.coldStartPresence = false;
    }
}
