import type { StaticScreenProps } from '@react-navigation/native';

import { BottomSheetScreen } from '@mobile/shared/navigation';
import type { DestructiveConfirmProps } from '@mobile/shared/ui';
import { DestructiveConfirm } from '@mobile/shared/ui';

type DestructiveConfirmSheetProps = StaticScreenProps<DestructiveConfirmProps>;

export const DestructiveConfirmSheet = (props: DestructiveConfirmSheetProps) => {
    return (
        <BottomSheetScreen>
            <DestructiveConfirm {...props.route.params} />
        </BottomSheetScreen>
    );
};
