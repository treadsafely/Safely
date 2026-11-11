import { View } from 'react-native';

import { Text } from '../Text';
import { styles } from './WordCell.styles';

interface WordCellParams {
    isLast?: boolean;
    isRightColumn?: boolean;
}

interface Props {
    word: string;
    index: number;
    params: WordCellParams;
    /** set on the word itself, so e2e can read it with copyTextFrom */
    testID?: string;
}

export const WordCell = (props: Props) => {
    const { index, word, params, testID } = props;
    const { isLast = false, isRightColumn = false } = params;

    styles.useVariants({ isLast, isRightColumn });

    return (
        <View style={styles.container}>
            <Text variant="bodyM" color="tertiary" style={styles.number}>
                {index}.
            </Text>
            <Text variant="bodyM" testID={testID}>
                {word}
            </Text>
        </View>
    );
};
