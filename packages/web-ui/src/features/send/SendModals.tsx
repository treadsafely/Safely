import type { FC } from 'react';

import { SendModal } from './SendModal';
import type { useSendFlow } from './useSendFlow';

export type SendModalsProps = {
    flow: ReturnType<typeof useSendFlow>;
};

export const SendModals: FC<SendModalsProps> = ({ flow }) =>
    flow.isOpen ? <SendModal initialValues={flow.initialValues} onClose={flow.onClose} /> : null;
