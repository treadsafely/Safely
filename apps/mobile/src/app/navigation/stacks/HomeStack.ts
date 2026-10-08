import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { BtcScreen } from '@mobile/screens/BtcScreen';
import { FlameScreen } from '@mobile/screens/FlameScreen';
import { HomeScreen } from '@mobile/screens/HomeScreen';

export const HomeStack = createNativeStackNavigator({
    initialRouteName: 'HomeScreen',
    screens: {
        HomeScreen: HomeScreen,
        BtcScreen: BtcScreen,
        FlameScreen: FlameScreen
    },
    screenOptions: {
        headerShown: false
    }
});
