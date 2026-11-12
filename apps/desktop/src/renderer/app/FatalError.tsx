import type { FC } from 'react';

import { FatalErrorPage } from '@safely/web-ui';

import { platform } from '../platform';

export const FatalError: FC = () => (
    <FatalErrorPage onShareLogs={() => void platform.logs.share()} />
);
