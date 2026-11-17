import { useTranslation } from 'react-i18next';

import { useActiveAccountMeta } from '@safely/ux';

import { useSignOutAccountConfirmation } from '@mobile/features/settings/useSignOutAccountConfirmation';
import { TEST_ID } from '@mobile/shared/constants';
import { Cell, Text } from '@mobile/shared/ui';

import { styles } from './SignOutAccountButton.styles';

type SignOutAccountButtonProps = {
    showDivider?: boolean;
};

export const SignOutAccountButton = (props: SignOutAccountButtonProps) => {
    const { showDivider = true } = props;
    const { t } = useTranslation();
    const accountName = useActiveAccountMeta().name;
    const handleSignOut = useSignOutAccountConfirmation();

    return (
        <Cell
            testID={TEST_ID.settings.signOutAccount}
            showDivider={showDivider}
            background="accentRed"
            onPress={handleSignOut}
        >
            <Cell.Content>
                <Cell.Row style={styles.row}>
                    <Text variant="labelL" textAlign="center" style={styles.text}>
                        {t('settings.signOutAccount.title', { name: accountName })}
                    </Text>
                </Cell.Row>
            </Cell.Content>
        </Cell>
    );
};
