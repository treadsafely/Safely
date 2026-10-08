import type { FC } from 'react';

import Loader56 from '@safely/ux/assets/icons/56/loader-56.svg?react';
import { spinner } from '@safely/web-ui/styled-system/recipes';

import { overlayStyles } from './LoaderViewport.styles';
import { useLoaderStore } from './store';
import { Icon } from '../ui';

const LOADER_SIZE = 96;

export const LoaderViewport: FC = () => {
    const isPending = useLoaderStore(state => state.pending > 0);

    if (!isPending) {
        return null;
    }

    return (
        <div className={overlayStyles} role="status" aria-busy>
            <Icon asset={Loader56} size={LOADER_SIZE} tone="primary" className={spinner()} />
        </div>
    );
};
