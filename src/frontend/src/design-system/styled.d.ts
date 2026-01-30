import 'styled-components';
import { WorkforceTheme } from './theme';

declare module 'styled-components' {
  export interface DefaultTheme extends WorkforceTheme {}
}
