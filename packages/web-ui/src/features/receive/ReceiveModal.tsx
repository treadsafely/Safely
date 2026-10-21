import { QRCodeSVG } from 'qrcode.react';
import type { FC } from 'react';

import { BTC_ASSET, splitInHalf } from '@safely/core';
import {
    useIsActivePortfolioTestnet,
    useIsActivePortfolioWatchOnly,
    useReceiveInfo,
    useTranslate
} from '@safely/ux';

import {
    actionsStyles,
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
import { AssetIcon } from '../../entities';
import { Badge, Button, Modal, Text, Toast, useCopyToClipboard } from '../../shared';

export type ReceiveModalProps = {
    onClose: () => void;
};

export const ReceiveModal: FC<ReceiveModalProps> = ({ onClose }) => {
    const t = useTranslate();
    const { displayAddress } = useReceiveInfo();
    const { isCopied, copy } = useCopyToClipboard();
    const isTestnet = useIsActivePortfolioTestnet();
    const isWatchOnly = useIsActivePortfolioWatchOnly();

    const [firstLine, secondLine] = splitInHalf(displayAddress);

    return (
        <Modal open onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup className={popupStyles} closeLabel={t('common.close')}>
                <Modal.Content className={contentStyles}>
                    <Modal.Title>
                        {t('receiveAsset.title', { symbol: BTC_ASSET.symbol })}
                    </Modal.Title>
                    <Modal.Description>
                        {t('receiveAsset.description', {
                            name: BTC_ASSET.name ?? BTC_ASSET.symbol
                        })}
                    </Modal.Description>
                </Modal.Content>

                <div className={bodyStyles}>
                    <div className={cardStyles}>
                        <div className={qrStyles}>
                            <QRCodeSVG value={displayAddress} size={QR_SIZE} level="H" />

                            <div className={cutoutStyles}>
                                <AssetIcon image={BTC_ASSET.image} size={LOGO_SIZE} />
                            </div>

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
                            onClick={() => copy(displayAddress)}
                        >
                            {firstLine}
                            <br />
                            {secondLine}
                        </Text>

                        {(isWatchOnly || isTestnet) && (
                            <div className={badgesStyles}>
                                {isWatchOnly && (
                                    <Badge tone="warningFilled" isUppercase>
                                        {t('portfolio.watchOnly')}
                                    </Badge>
                                )}
                                {isTestnet && (
                                    <Badge tone="warningFilled" isUppercase>
                                        {t('portfolio.testnet')}
                                    </Badge>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className={actionsStyles}>
                    <Button variant="secondary" size="small" onClick={() => copy(displayAddress)}>
                        {t('actions.copy')}
                    </Button>
                </div>
            </Modal.Popup>
        </Modal>
    );
};
