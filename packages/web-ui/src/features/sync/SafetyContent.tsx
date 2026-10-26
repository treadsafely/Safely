import type { FC } from 'react';
import { useState } from 'react';

import {
    AccountLinkState,
    useAccountLinkState,
    useCompleteSyncOnboarding,
    useIsAttentionRequired,
    useSyncedDevices,
    useSyncOnboardingCompletedQuery,
    useTranslate
} from '@safely/ux';
import DeviceLinkCheckmark96 from '@safely/ux/assets/icons/96/device-link-checkmark-96.svg?react';
import DeviceLinkExclamationmark96 from '@safely/ux/assets/icons/96/device-link-exclamationmark-96.svg?react';

import { ArchivedDevices } from './ArchivedDevices';
import { DeviceDetailsModal } from './DeviceDetailsModal';
import { DeviceLinkedModal } from './DeviceLinkedModal';
import { DeviceRow } from './DeviceRow';
import { DeviceSupportWizardModal } from './DeviceSupportWizardModal';
import { LinkDeviceWarningModal } from './LinkDeviceWarningModal';
import {
    actionsStyles,
    headingStyles,
    listStyles,
    rootStyles,
    stepNumberStyles,
    stepsStyles,
    stepStyles
} from './SafetyContent.styles';
import { SyncAboutModal } from './SyncAboutModal';
import { useLinkDevice } from './useLinkDevice';
import { Banner, Button, Icon, List, Text } from '../../shared';

type SafetyStep =
    | { kind: 'about' }
    | { kind: 'linkWarning' }
    | { kind: 'linked'; ikPubHex: string }
    | { kind: 'device'; ikPubHex: string }
    | { kind: 'wizard'; ikPubHex: string };

const SOLO_STEP_KEYS = [
    'safety.protectAccount.steps.step1',
    'safety.protectAccount.steps.step2',
    'safety.protectAccount.steps.step3'
] as const;

export type SafetyContentProps = {
    onAddAccount: () => void;
};

export const SafetyContent: FC<SafetyContentProps> = ({ onAddAccount }) => {
    const t = useTranslate();
    const linkState = useAccountLinkState();
    const isAttentionRequired = useIsAttentionRequired();
    const devices = useSyncedDevices();
    const linkDevice = useLinkDevice();

    const { data: isOnboardingCompleted } = useSyncOnboardingCompletedQuery();
    const { mutateAsync: completeOnboarding } = useCompleteSyncOnboarding();

    const [step, setStep] = useState<SafetyStep | null>(null);

    const activeDevices = devices.filter(device => device.archive === null);
    const archivedDevices = devices.filter(device => device.archive !== null);
    const isLinked = linkState === AccountLinkState.PROTECTED;
    const isAboutOpen = step?.kind === 'about' || isOnboardingCompleted === false;

    const closeAbout = (): void => {
        setStep(current => (current?.kind === 'about' ? null : current));

        if (isOnboardingCompleted === false) {
            void completeOnboarding();
        }
    };

    const startLink = (): void => {
        setStep(null);

        void linkDevice().then(ikPubHex => {
            if (ikPubHex !== null) {
                setStep({ kind: 'linked', ikPubHex });
            }
        });
    };

    return (
        <div className={rootStyles}>
            <Icon
                asset={isLinked ? DeviceLinkCheckmark96 : DeviceLinkExclamationmark96}
                size={96}
            />

            <div className={headingStyles}>
                <Text variant="titleM" align="center">
                    {t(
                        isLinked ? 'security.accountProtected.title' : 'safety.protectAccount.title'
                    )}
                </Text>
                <Text variant="bodyL" tone="secondary" align="center">
                    {t(
                        isLinked
                            ? 'security.accountProtected.subtitle'
                            : 'safety.protectAccount.subtitle'
                    )}
                </Text>
            </div>

            <div className={actionsStyles}>
                <Button
                    variant={isLinked ? 'secondary' : 'primary'}
                    size="small"
                    onClick={() => setStep({ kind: 'linkWarning' })}
                >
                    {t('safety.linkDevice')}
                </Button>
                <Button variant="secondary" size="small" onClick={() => setStep({ kind: 'about' })}>
                    {t('safety.about')}
                </Button>
            </div>

            {isLinked ? (
                <>
                    <List className={listStyles}>
                        <List.Title>{t('security.accountProtected.listTitle')}</List.Title>
                        <List.Group variant="separated">
                            {isAttentionRequired && (
                                <Banner tone="danger">
                                    <Banner.Content>
                                        <Banner.Text>
                                            {t('security.accountProtected.attention')}
                                        </Banner.Text>
                                    </Banner.Content>
                                </Banner>
                            )}

                            {activeDevices.map(device => (
                                <DeviceRow
                                    key={device.ikPubHex}
                                    device={device}
                                    onSelect={() =>
                                        setStep({ kind: 'device', ikPubHex: device.ikPubHex })
                                    }
                                />
                            ))}
                        </List.Group>
                    </List>

                    <ArchivedDevices
                        devices={archivedDevices}
                        onSelect={ikPubHex => setStep({ kind: 'device', ikPubHex })}
                    />
                </>
            ) : (
                <ol className={stepsStyles}>
                    {SOLO_STEP_KEYS.map((key, index) => (
                        <li key={key} className={stepStyles}>
                            <Text
                                variant="bodyM"
                                tone="tertiary"
                                isTabular
                                className={stepNumberStyles}
                            >
                                {index + 1}.
                            </Text>
                            <Text variant="bodyM">{t(key)}</Text>
                        </li>
                    ))}
                </ol>
            )}

            {isAboutOpen && <SyncAboutModal onClose={closeAbout} />}

            {step?.kind === 'linkWarning' && (
                <LinkDeviceWarningModal onContinue={startLink} onClose={() => setStep(null)} />
            )}

            {step?.kind === 'linked' && (
                <DeviceLinkedModal
                    ikPubHex={step.ikPubHex}
                    onViewLinkedDevices={() => setStep(null)}
                    onClose={() => setStep(null)}
                />
            )}

            {step?.kind === 'device' && (
                <DeviceDetailsModal
                    ikPubHex={step.ikPubHex}
                    onOpenHelp={() => setStep({ kind: 'wizard', ikPubHex: step.ikPubHex })}
                    onClose={() => setStep(null)}
                />
            )}

            {step?.kind === 'wizard' && (
                <DeviceSupportWizardModal
                    ikPubHex={step.ikPubHex}
                    onAddAccount={() => {
                        setStep(null);
                        onAddAccount();
                    }}
                    onClose={() => setStep(null)}
                />
            )}
        </div>
    );
};
