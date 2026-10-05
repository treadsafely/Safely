import type { StaticScreenProps } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { useAppContext } from '@safely/ux';

import { Screen, Text, WordCell } from '@mobile/shared/ui';
import { ExclamationmarkCircle16, Icon } from '@mobile/shared/ui/Icon';

import { styles } from './RecoveryPhraseSheet.styles';
import { CapturePreventionView } from '../../../../../modules/safely-capture-prevention/src';

type RecoveryPhraseSheetProps = StaticScreenProps<{
    mnemonic: string[];
}>;

export const RecoveryPhraseSheet = (props: RecoveryPhraseSheetProps) => {
    const { t } = useTranslation();
    const { logger } = useAppContext();
    const { mnemonic: phrase } = props.route.params;

    const halfLength = Math.ceil(phrase.length / 2);
    const leftColumn = phrase.slice(0, halfLength);
    const rightColumn = phrase.slice(halfLength);

    return (
        <Screen>
            <Screen.Header variant="left">
                <Screen.Header.Title>{t('security.phraseSheet.title')}</Screen.Header.Title>
                <Screen.Header.CloseButton />
            </Screen.Header>
            <Screen.Content>
                <CapturePreventionView
                    style={styles.captureScreen}
                    onUnsupported={() =>
                        logger.error('[RecoveryPhraseSheet] capture protection unavailable')
                    }
                >
                    <View style={styles.content}>
                        <View style={styles.banner}>
                            <Text variant="bodyM" style={styles.bannerText}>
                                {t('security.phraseSheet.warning')}
                            </Text>
                            <Icon icon={ExclamationmarkCircle16} style={styles.bannerIcon} />
                        </View>

                        <View style={styles.wordsContainer}>
                            <View style={styles.column}>
                                {leftColumn.map((word, i) => (
                                    <WordCell
                                        key={i}
                                        index={i + 1}
                                        word={word}
                                        params={{
                                            isLast: i === leftColumn.length - 1,
                                            isRightColumn: false
                                        }}
                                    />
                                ))}
                            </View>
                            <View style={styles.column}>
                                {rightColumn.map((word, i) => (
                                    <WordCell
                                        key={i}
                                        index={halfLength + i + 1}
                                        word={word}
                                        params={{
                                            isLast: i === rightColumn.length - 1,
                                            isRightColumn: true
                                        }}
                                    />
                                ))}
                            </View>
                        </View>
                    </View>
                </CapturePreventionView>
            </Screen.Content>
        </Screen>
    );
};
