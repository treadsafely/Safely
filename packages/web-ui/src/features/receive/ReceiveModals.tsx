import type { FC } from 'react';

import { ReceiveModal } from './ReceiveModal';
import type { useReceiveFlow } from './useReceiveFlow';

export type ReceiveModalsProps = {
    flow: ReturnType<typeof useReceiveFlow>;
};

export const ReceiveModals: FC<ReceiveModalsProps> = ({ flow }) =>
    flow.isOpen ? <ReceiveModal onClose={flow.onClose} /> : null;
