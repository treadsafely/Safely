import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useSuspenseQuery } from '@safely/ux';

import { passcodeKeys } from './keys';
import { useDesktopLayerEncryptedStorage } from '../../shared';

export type UsePasscodeResult =
    | {
          isSet: true;
          length: number;
          validate: (input: string) => Promise<boolean>;
          set: (passcode: string) => Promise<void>;
          remove: () => Promise<void>;
      }
    | {
          isSet: false;
          length?: undefined;
          validate?: undefined;
          remove?: undefined;
          set: (passcode: string) => Promise<void>;
      };

export function usePasscode(): UsePasscodeResult {
    const client = useQueryClient();
    const {
        get: storageGet,
        set: storageSet,
        remove: storageRemove
    } = useDesktopLayerEncryptedStorage('passcode');

    const { data } = useSuspenseQuery({
        queryKey: passcodeKeys.state.toKey(),
        async queryFn() {
            const passcode = await storageGet();

            return passcode === null
                ? ({ isSet: false } as const)
                : ({ isSet: true, length: passcode.length } as const);
        }
    });

    const invalidate = useCallback(
        () => client.invalidateQueries({ queryKey: passcodeKeys.state.toKey() }),
        [client]
    );

    const validate = useCallback(
        async (input: string) => {
            const passcode = await storageGet();

            if (passcode === null) {
                throw new Error('Can not validate passcode that is not set.');
            }

            return passcode === input;
        },
        [storageGet]
    );

    const set = useCallback(
        async (passcode: string) => {
            await storageSet(passcode);
            await invalidate();
        },
        [storageSet, invalidate]
    );

    const remove = useCallback(async () => {
        await storageRemove();
        await invalidate();
    }, [storageRemove, invalidate]);

    return data.isSet
        ? { isSet: true, length: data.length, validate, set, remove }
        : { isSet: false, set };
}
