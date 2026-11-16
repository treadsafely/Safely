import type { DesktopPlatform } from '../../platform';

export class BiometryPrompt {
    private isOpen = false;

    constructor(
        private readonly biometry: DesktopPlatform['biometry'],
        private readonly reason: () => string
    ) {}

    public async authenticate(): Promise<boolean> {
        this.isOpen = true;

        try {
            return await this.biometry.authenticate(this.reason());
        } finally {
            this.isOpen = false;
        }
    }

    public isPromptOpen(): boolean {
        return this.isOpen;
    }
}
