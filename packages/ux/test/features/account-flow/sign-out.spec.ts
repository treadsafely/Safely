import { describe, expect, it } from 'vitest';

import {
    resolveSignOutCopy,
    resolveSignOutPlan
} from '../../../src/features/account-flow/sign-out';

describe('resolveSignOutPlan', () => {
    it('deletes the account and toasts when other accounts remain', () => {
        expect(resolveSignOutPlan({ isLastAccount: false, isSynced: true })).toEqual({
            isSynced: true,
            shouldDeleteAccount: true,
            shouldEraseAllData: false,
            toastKey: 'settings.signOutAccount.toastAccountRemoved'
        });
    });

    it('deletes an offline account too when it is not the last one', () => {
        expect(resolveSignOutPlan({ isLastAccount: false, isSynced: false })).toEqual({
            isSynced: false,
            shouldDeleteAccount: true,
            shouldEraseAllData: false,
            toastKey: 'settings.signOutAccount.toastAccountRemoved'
        });
    });

    it('wipes the device for the last synced account without a separate server delete', () => {
        expect(resolveSignOutPlan({ isLastAccount: true, isSynced: true })).toEqual({
            isSynced: true,
            shouldDeleteAccount: false,
            shouldEraseAllData: true,
            toastKey: null
        });
    });

    it('skips the server delete for the last offline account, so no unlock is needed', () => {
        expect(resolveSignOutPlan({ isLastAccount: true, isSynced: false })).toEqual({
            isSynced: false,
            shouldDeleteAccount: false,
            shouldEraseAllData: true,
            toastKey: null
        });
    });
});

describe('resolveSignOutCopy', () => {
    it('asks for an acknowledgement when this is the only linked device', () => {
        expect(resolveSignOutCopy(false)).toEqual({
            subtitleKey: 'settings.signOutAccount.sheet.noDevices.subtitle',
            checkboxKey: 'settings.signOutAccount.sheet.noDevices.checkbox'
        });
    });

    it('drops the acknowledgement when other devices still hold the account', () => {
        expect(resolveSignOutCopy(true)).toEqual({
            subtitleKey: 'settings.signOutAccount.sheet.fullCopy.subtitle'
        });
    });
});
