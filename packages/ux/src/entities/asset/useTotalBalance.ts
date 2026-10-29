import { useActiveBtcWallet } from '../portfolio';
import { useBtcWalletFiatBalance } from './usePortfolioBalance';

export function useTotalBalance() {
    return useBtcWalletFiatBalance(useActiveBtcWallet());
}
