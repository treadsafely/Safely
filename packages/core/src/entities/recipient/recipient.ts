import { BLOCKCHAIN_NAME } from '../blockchain';

export interface RecipientDisplayData {
    address: string;
    name?: string;
}

export interface Recipient {
    readonly blockchain: BLOCKCHAIN_NAME.BTC;
    readonly address: string;
    getDisplayData(): RecipientDisplayData;
}

export class BtcRecipient implements Recipient {
    public readonly blockchain = BLOCKCHAIN_NAME.BTC;

    constructor(public readonly address: string) {}

    public getDisplayData(): RecipientDisplayData {
        return { address: this.address };
    }
}
