import {
    Blur,
    Canvas,
    Circle,
    ImageShader,
    LinearGradient,
    Rect,
    useImage,
    vec
} from '@shopify/react-native-skia';
import Color from 'color';
import { useWindowDimensions } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

import { resources } from '@mobile/shared/resources';

import { styles } from './GradientBackground.styles';

const SHADE_RADIUS = 400;
const SHADE_BLUR = 100;
const SHADE_OFFSET = 106;
const FADE_HEIGHT = 164;
const NOISE_OPACITY = 0.2;
const NOISE_SCALE = 0.84375;
const FADE_ALPHAS = [
    0, 0.009, 0.036, 0.082, 0.147, 0.232, 0.332, 0.443, 0.557, 0.668, 0.768, 0.853, 0.918, 0.964,
    0.991, 1
];

type GradientBackgroundProps = {
    color: string;
    position: 'top' | 'bottom';
    height: number;
};

export const GradientBackground = (props: GradientBackgroundProps) => {
    const { color, position, height } = props;
    const { width } = useWindowDimensions();
    const { theme } = useUnistyles();
    const noise = useImage(resources.noise as number);

    const shade = theme.colors.background.primary;
    const fadeColors = FADE_ALPHAS.map(alpha => Color(shade).alpha(alpha).string());
    const isTop = position === 'top';

    const shadeCenterY = isTop ? height + SHADE_OFFSET : 0;
    const fadeTop = isTop ? height - FADE_HEIGHT : 0;
    const fadeFrom = vec(0, isTop ? fadeTop : FADE_HEIGHT);
    const fadeTo = vec(0, isTop ? height : 0);

    return (
        <Canvas pointerEvents="none" style={styles.canvas({ position, height })}>
            <Rect x={0} y={0} width={width} height={height} color={color} />
            <Circle cx={width / 2} cy={shadeCenterY} r={SHADE_RADIUS} color={shade}>
                <Blur blur={SHADE_BLUR} />
            </Circle>
            {noise && (
                <Rect
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                    opacity={NOISE_OPACITY}
                    blendMode="overlay"
                >
                    <ImageShader
                        image={noise}
                        tx="repeat"
                        ty="repeat"
                        transform={[{ scale: NOISE_SCALE }]}
                    />
                </Rect>
            )}
            <Rect x={0} y={fadeTop} width={width} height={FADE_HEIGHT}>
                <LinearGradient start={fadeFrom} end={fadeTo} colors={fadeColors} />
            </Rect>
        </Canvas>
    );
};
