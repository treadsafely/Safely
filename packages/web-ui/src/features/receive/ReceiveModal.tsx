import { QRCodeSVG } from 'qrcode.react';
import type { FC, ReactNode } from 'react';

import type { CryptoAsset } from '@safely/core';
import { BTC_ASSET, FLAME_ASSET } from '@safely/core';
import type { PortfolioNetworkBadge } from '@safely/ux';
import {
    useActivePortfolioNetworkBadge,
    useActivePortfolioWallets,
    useBtcReceiveInfo,
    useFlameReceiveInfo,
    useIsActivePortfolioWatchOnly,
    useTranslate
} from '@safely/ux';

import {
    actionsStyles,
    addressRestStyles,
    addressStyles,
    badgesStyles,
    bodyStyles,
    cardStyles,
    contentStyles,
    copiedStyles,
    cutoutStyles,
    LOGO_SIZE,
    popupStyles,
    QR_SIZE,
    qrStyles
} from './ReceiveModal.styles';
import { AssetIcon, FlameLogo } from '../../entities';
import { Badge, Button, Modal, Text, Toast, useCopyToClipboard } from '../../shared';

type ReceiveCardProps = {
    asset: CryptoAsset;
    address: string;
    trackingAddress?: string;
    logo: ReactNode;
    isWatchOnly: boolean;
    networkBadge: PortfolioNetworkBadge | null;
};

const ReceiveCard: FC<ReceiveCardProps> = props => {
    const { asset, address, trackingAddress, logo, isWatchOnly, networkBadge } = props;

    const t = useTranslate();
    const { isCopied, copy } = useCopyToClipboard();
    const hasTrackingPrefix = trackingAddress !== undefined && address.startsWith(trackingAddress);

    return (
        <>
            <Modal.Content className={contentStyles}>
                <Modal.Title>{t('receiveAsset.title', { symbol: asset.symbol })}</Modal.Title>
                <Modal.Description>
                    {t('receiveAsset.description', { name: asset.name ?? asset.symbol })}
                </Modal.Description>
            </Modal.Content>

            <div className={bodyStyles}>
                <div className={cardStyles}>
                    <div className={qrStyles}>
                        <QRCodeSVG value={address} size={QR_SIZE} level="H" />

                        <div className={cutoutStyles}>{logo}</div>

                        {isCopied && (
                            <Toast
                                variant="white"
                                message={t('actions.copied')}
                                className={copiedStyles}
                                role="status"
                            />
                        )}
                    </div>

                    <Text
                        variant="labelM"
                        tone="constantBlack"
                        align="center"
                        className={addressStyles}
                        onClick={() => copy(address)}
                    >
                        {hasTrackingPrefix ? (
                            <>
                                {trackingAddress}
                                <span className={addressRestStyles}>
                                    {address.slice(trackingAddress.length)}
                                </span>
                            </>
                        ) : (
                            address
                        )}
                    </Text>

                    {(isWatchOnly || networkBadge !== null) && (
                        <div className={badgesStyles}>
                            {isWatchOnly && (
                                <Badge tone="warningFilled" isUppercase>
                                    {t('portfolio.watchOnly')}
                                </Badge>
                            )}
                            {networkBadge !== null && (
                                <Badge
                                    tone={
                                        networkBadge.tone === 'purple' ? 'purple' : 'warningFilled'
                                    }
                                    isUppercase
                                >
                                    {t(networkBadge.labelKey)}
                                </Badge>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className={actionsStyles}>
                <Button variant="secondary" size="small" onClick={() => copy(address)}>
                    {t('actions.copy')}
                </Button>
            </div>
        </>
    );
};

const BtcReceive: FC = () => {
    const { displayAddress } = useBtcReceiveInfo();
    const isWatchOnly = useIsActivePortfolioWatchOnly();
    const networkBadge = useActivePortfolioNetworkBadge();

    return (
        <ReceiveCard
            asset={BTC_ASSET}
            address={displayAddress}
            logo={<AssetIcon image={BTC_ASSET.image} size={LOGO_SIZE} />}
            isWatchOnly={isWatchOnly}
            networkBadge={networkBadge}
        />
    );
};

const FlameReceive: FC = () => {
    const { displayAddress, trackingAddress } = useFlameReceiveInfo();
    const networkBadge = useActivePortfolioNetworkBadge();

    return (
        <ReceiveCard
            asset={FLAME_ASSET}
            address={displayAddress}
            trackingAddress={trackingAddress}
            logo={<FlameLogo size={LOGO_SIZE} background="black" />}
            isWatchOnly={false}
            networkBadge={networkBadge}
        />
    );
};

export type ReceiveModalProps = {
    onClose: () => void;
};

export const ReceiveModal: FC<ReceiveModalProps> = ({ onClose }) => {
    const t = useTranslate();
    const wallets = useActivePortfolioWallets();

    return (
        <Modal open onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup className={popupStyles} closeLabel={t('common.close')}>
                {wallets.flame !== null ? <FlameReceive /> : <BtcReceive />}
            </Modal.Popup>
        </Modal>
    );
};
