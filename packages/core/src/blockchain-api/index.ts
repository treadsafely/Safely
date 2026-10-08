import type { BtcEstimation, BtcTransactionTemplate } from './btc';
import type { BtcSendResult } from './btc/btc-transaction-template';

export type Estimation = BtcEstimation;
export type TransactionTemplate = BtcTransactionTemplate;
export type SendResult = BtcSendResult;

export * from './shared';
export * from './btc';
export * from './flame';
