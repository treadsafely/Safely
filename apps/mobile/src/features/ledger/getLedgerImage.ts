import type { ImageSourcePropType } from 'react-native';

import type { LedgerImageKey } from '@safely/ux';
import { getLedgerImageKey } from '@safely/ux';

import { resources } from '@mobile/shared/resources';

const LEDGER_IMAGE: Record<LedgerImageKey, ImageSourcePropType> = {
    stax: resources.ledgerCovers.stax,
    flex: resources.ledgerCovers.flex,
    nanoX: resources.ledgerCovers.xNano,
    nanoGen5: resources.ledgerCovers.xNanoGen5,
    preview: resources.ledgerPreview
};

export const getLedgerImage = (model?: string): ImageSourcePropType =>
    LEDGER_IMAGE[getLedgerImageKey(model)];
