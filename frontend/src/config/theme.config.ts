import DARK_MODE from '../constants/darkMode.constant';
import { TBorderWidth } from '../types/borderWidth.type';
import { TColorIntensity } from '../types/colorIntensities.type';
import { TColors } from '../types/colors.type';
import { TDarkMode } from '../types/darkMode.type';
import { TLang } from '../types/lang.type';
import { TRounded } from '../types/rounded.type';

type TThemeConfigs = {
    projectTitle: string;
    projectName: string;
    language: TLang;
    theme: TDarkMode;
    themeColor: TColors;
    themeColorShade: TColorIntensity;
    rounded: TRounded;
    /**
     * UI Components
     *
     * If you give "border-0", you will remove the borders on the components.
     */
    borderWidth: TBorderWidth;
    /**
     * Default: 'transition-all duration-300 ease-in-out'
     *
     * For more information;
     *
     * https://tailwindcss.com/docs/transition-property
     *
     * https://tailwindcss.com/docs/transition-duration
     *
     * https://tailwindcss.com/docs/transition-timing-function
     *
     * https://tailwindcss.com/docs/transition-delay
     */
    transition: string;
    fontSize: 12 | 13 | 14 | 15 | 16 | 17 | 18;
};

const themeConfig: TThemeConfigs = {
    projectTitle: 'Gestion Snabbit',
    projectName: 'Gestion Snabbit',
    language: 'es',
    theme: DARK_MODE.SYSTEM,
    themeColor: 'blue',
    themeColorShade: '500',
    rounded: 'rounded-lg',
    borderWidth: 'border-2',
    transition: 'transition-all duration-300 ease-in-out',
    fontSize: 13,
};

export default themeConfig;
