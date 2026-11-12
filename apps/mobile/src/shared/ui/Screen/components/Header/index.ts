import { BackButton, Button, CloseButton, ButtonPlaceholder, Title } from './components';
import { HeaderContainer } from './Header';

export { useScreenHeaderHeight } from './useScreenHeaderHeight';

export const Header = Object.assign(HeaderContainer, {
    BackButton,
    Button,
    Title,
    CloseButton,
    ButtonPlaceholder
});
