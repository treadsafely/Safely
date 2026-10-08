import type { FC } from 'react';

import { useActiveAccountStoreSlot } from '@safely/ux';

import { AddAccountModal } from './AddAccountModal';
import { SignOutModal } from './SignOutModal';
import type { useAccountFlow } from './useAccountFlow';
import { CustomizeAccountModal } from '../../entities';
import { SignInModal, SignInSuccessModal } from '../sync';

export type AccountModalsProps = {
    flow: ReturnType<typeof useAccountFlow>;
};

export const AccountModals: FC<AccountModalsProps> = ({ flow }) => {
    const accountMeta = useActiveAccountStoreSlot('meta');

    return (
        <>
            {flow.addStep === 'menu' && (
                <AddAccountModal
                    onCreateNew={flow.startCreate}
                    onSignIn={() => void flow.startSignIn()}
                    onClose={flow.closeAdd}
                />
            )}

            {flow.addStep === 'signIn' && flow.connectionString !== undefined && (
                <SignInModal connectionString={flow.connectionString} onClose={flow.closeAdd} />
            )}

            {flow.addStep === 'signInSuccess' && (
                <SignInSuccessModal
                    inviterIkPubHex={flow.inviterIkPubHex}
                    onContinue={flow.closeAdd}
                />
            )}

            {flow.draft && (
                <CustomizeAccountModal
                    defaultName={flow.draft.name}
                    onSave={name => void flow.save(name)}
                    onClose={flow.cancel}
                />
            )}

            {flow.isSigningOut && (
                <SignOutModal
                    accountName={accountMeta?.name ?? ''}
                    onConfirm={() => void flow.signOut()}
                    onClose={flow.cancelSignOut}
                />
            )}
        </>
    );
};
