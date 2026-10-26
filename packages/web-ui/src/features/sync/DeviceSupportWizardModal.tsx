import type { FC, ReactNode } from 'react';
import { useState } from 'react';

import type { SyncedDeviceDetails } from '@safely/ux';
import {
    SecurityCheckCancelledError,
    useArchiveDevice,
    useBootConfig,
    useErrorToast,
    useLinking,
    useSecurityCheck,
    useSyncedDeviceDetails,
    useToast,
    useTranslate
} from '@safely/ux';
import Bulb16 from '@safely/ux/assets/icons/16/bulb-16.svg?react';
import DeviceExclamationmark96 from '@safely/ux/assets/icons/96/device-exclamationmark-96.svg?react';

import {
    bodyStyles,
    dismissStyles,
    headingStyles,
    hintActionStyles,
    hintStyles,
    hintTextStyles,
    introStyles,
    popupStyles,
    questionStyles,
    questionTitleStyles,
    scrollStyles,
    supportButtonStyles
} from './DeviceSupportWizardModal.styles';
import { Banner, Button, Cell, Icon, List, Modal, Text } from '../../shared';

type DeviceAccessAnswer = 'has' | 'lost';
type OthersAccessAnswer = 'possible' | 'impossible';

const DEVICE_ACCESS_OPTIONS = [
    { value: 'has', labelKey: 'deviceSupportWizard.access.options.has' },
    { value: 'lost', labelKey: 'deviceSupportWizard.access.options.lost' }
] as const satisfies readonly { value: DeviceAccessAnswer; labelKey: string }[];

const OTHERS_ACCESS_OPTIONS = [
    { value: 'possible', labelKey: 'deviceSupportWizard.others.options.possible' },
    { value: 'impossible', labelKey: 'deviceSupportWizard.others.options.impossible' }
] as const satisfies readonly { value: OthersAccessAnswer; labelKey: string }[];

type WizardQuestionProps<TAnswer extends string> = {
    title: string;
    options: readonly { value: TAnswer; labelKey: string }[];
    answer: TAnswer | null;
    onAnswer: (value: TAnswer) => void;
    children?: ReactNode;
};

const WizardQuestion = <TAnswer extends string>(props: WizardQuestionProps<TAnswer>): ReactNode => {
    const { title, options, answer, onAnswer, children } = props;

    const t = useTranslate();

    return (
        <List className={questionStyles}>
            <Text variant="bodyL" className={questionTitleStyles}>
                {title}
            </Text>
            <List.Group>
                {options.map(option => (
                    <Cell key={option.value} onClick={() => onAnswer(option.value)}>
                        <Cell.Content>
                            <Cell.Row>
                                <Cell.Title>{t(option.labelKey)}</Cell.Title>
                            </Cell.Row>
                        </Cell.Content>
                        {answer === option.value && <Cell.Checkmark />}
                    </Cell>
                ))}
            </List.Group>
            {children}
        </List>
    );
};

type WizardHintProps = {
    title: string;
    description: string;
    action?: ReactNode;
};

const WizardHint: FC<WizardHintProps> = ({ title, description, action }) => (
    <Banner className={hintStyles}>
        <Banner.Content className={hintTextStyles}>
            <Icon asset={Bulb16} />
            <Text variant="labelM">{title}</Text>
            <Text variant="bodyM" tone="secondary">
                {description}
            </Text>
            {action !== undefined && <div className={hintActionStyles}>{action}</div>}
        </Banner.Content>
    </Banner>
);

type WizardContentProps = {
    details: SyncedDeviceDetails;
    onAddAccount: () => void;
    onClose: () => void;
};

const WizardContent: FC<WizardContentProps> = ({ details, onAddAccount, onClose }) => {
    const t = useTranslate();
    const toast = useToast();
    const check = useSecurityCheck();
    const errorToast = useErrorToast({});
    const { mutateAsync: archiveDevice } = useArchiveDevice();

    const [deviceAccess, setDeviceAccess] = useState<DeviceAccessAnswer | null>(null);
    const [othersAccess, setOthersAccess] = useState<OthersAccessAnswer | null>(null);

    const deviceName = details.meta.name;

    const handleDeviceAccess = (value: DeviceAccessAnswer): void => {
        setDeviceAccess(value);
        setOthersAccess(null);
    };

    const handleArchive = async (): Promise<void> => {
        try {
            await check({ subtitle: t('deviceSupportWizard.archive.verify', { deviceName }) });
            await archiveDevice(details.ikPubHex);
        } catch (error) {
            if (!(error instanceof SecurityCheckCancelledError)) {
                errorToast(error);
            }
            return;
        }

        onClose();
        toast(t('deviceSupportWizard.archive.done', { deviceName }));
    };

    return (
        <>
            <div className={introStyles}>
                <Icon asset={DeviceExclamationmark96} size={96} />

                <div className={headingStyles}>
                    <Text variant="titleM" align="center">
                        {t('deviceSupportWizard.intro.title', { deviceName })}
                    </Text>
                    <Text variant="bodyL" tone="secondary" align="center">
                        {t('deviceSupportWizard.intro.subtitle', { deviceName })}
                    </Text>
                </div>
            </div>

            <div className={bodyStyles}>
                <WizardQuestion
                    title={t('deviceSupportWizard.access.title')}
                    options={DEVICE_ACCESS_OPTIONS}
                    answer={deviceAccess}
                    onAnswer={handleDeviceAccess}
                >
                    {deviceAccess === 'has' && (
                        <WizardHint
                            title={t('deviceSupportWizard.signOut.title', { deviceName })}
                            description={t('deviceSupportWizard.signOut.description')}
                        />
                    )}
                </WizardQuestion>

                {deviceAccess === 'lost' && (
                    <WizardQuestion
                        title={t('deviceSupportWizard.others.title')}
                        options={OTHERS_ACCESS_OPTIONS}
                        answer={othersAccess}
                        onAnswer={setOthersAccess}
                    >
                        {othersAccess === 'possible' && (
                            <WizardHint
                                title={t('deviceSupportWizard.moveFunds.title')}
                                description={t('deviceSupportWizard.moveFunds.description')}
                                action={
                                    <Button variant="primary" size="small" onClick={onAddAccount}>
                                        {t('deviceSupportWizard.moveFunds.action')}
                                    </Button>
                                }
                            />
                        )}
                        {othersAccess === 'impossible' && (
                            <WizardHint
                                title={t('deviceSupportWizard.archive.title')}
                                description={t('deviceSupportWizard.archive.description')}
                                action={
                                    <Button variant="tertiary" size="small" onClick={handleArchive}>
                                        {t('deviceSupportWizard.archive.action', { deviceName })}
                                    </Button>
                                }
                            />
                        )}
                    </WizardQuestion>
                )}

                {(deviceAccess === 'has' || othersAccess !== null) && (
                    <Button
                        variant="secondary"
                        size="small"
                        className={dismissStyles}
                        onClick={onClose}
                    >
                        {t('deviceSupportWizard.dismiss')}
                    </Button>
                )}
            </div>
        </>
    );
};

export type DeviceSupportWizardModalProps = {
    ikPubHex: string;
    onAddAccount: () => void;
    onClose: () => void;
};

export const DeviceSupportWizardModal: FC<DeviceSupportWizardModalProps> = props => {
    const { ikPubHex, onAddAccount, onClose } = props;

    const t = useTranslate();
    const { openURL } = useLinking();
    const details = useSyncedDeviceDetails(ikPubHex);
    const supportEmail = useBootConfig().references.support.email;

    return (
        <Modal open onOpenChange={isOpen => !isOpen && onClose()}>
            <Modal.Popup className={popupStyles} closeLabel={t('common.close')}>
                <Button
                    variant="secondary"
                    size="xsmall"
                    className={supportButtonStyles}
                    onClick={() => void openURL(`mailto:${supportEmail}`)}
                >
                    {t('deviceSupportWizard.title')}
                </Button>

                {/* the answers grow past the popup's max height, and the buttons float over it */}
                <div className={scrollStyles}>
                    {details !== null && (
                        <WizardContent
                            details={details}
                            onAddAccount={onAddAccount}
                            onClose={onClose}
                        />
                    )}
                </div>
            </Modal.Popup>
        </Modal>
    );
};
