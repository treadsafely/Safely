import type { BtcEstimation, BtcTransactionTemplate } from './btc';
import type { BtcSendResult } from './btc/btc-transaction-template';
import type { FlameEstimation, FlameSendResult, FlameTransactionTemplate } from './flame';

export type Estimation = BtcEstimation | FlameEstimation;
export type TransactionTemplate = BtcTransactionTemplate | FlameTransactionTemplate;
export type SendResult = BtcSendResult | FlameSendResult;

export * from './shared';
export * from './btc';
export * from './flame';
