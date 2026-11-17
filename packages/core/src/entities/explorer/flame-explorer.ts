import type { FlameChainConfig } from '../../api/config/models';

export class FlameExplorer {
    constructor(private readonly config: FlameChainConfig) {}

    public wallet(address: string): string {
        return this.config.explorer_account_url.replace('%s', address);
    }
    public transaction(txid: string): string {
        return this.config.explorer_tx_url.replace('%s', txid);
    }
}
