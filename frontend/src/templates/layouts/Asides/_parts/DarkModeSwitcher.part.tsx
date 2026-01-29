import React, { FC, useState } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import DARK_MODE from '../../../../constants/darkMode.constant';
import Icon from '../../../../components/icon/Icon';
import useDarkMode from '../../../../hooks/useDarkMode';
import { TIcons } from '../../../../types/icons.type';
import { TDarkMode } from '../../../../types/darkMode.type';
import useAsideStatus from '../../../../hooks/useAsideStatus';
import themeConfig from '../../../../config/theme.config';
import ApiService from '@/services/ApiService';
import { toast } from 'react-toastify';
import { obtenerPersonalizacionThunk, useAppDispatch, useAppSelector } from '@/store';

interface IStyledButtonProps {
    text: string;
    icon: TIcons;
    status: TDarkMode;
}
const StyledButton: FC<IStyledButtonProps> = ({ text, icon, status }) => {
    const dispatch = useAppDispatch();
    const { darkModeStatus, setDarkModeStatus } = useDarkMode();
    const { asideStatus } = useAsideStatus();
    const { personalizacionUsuario, access } = useAppSelector((state) => state.auth);
    const [isChanging, setIsChanging] = useState<boolean>(false);

    const actualizarTema = async (tema: string) => {
        setIsChanging(true);
        try {
            const response = await ApiService.fetchData({
                url: `/api/personalizacion-usuarios/${personalizacionUsuario?.id}/`,
                method: 'patch',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({ tema: tema }),
            });
            if (response.data) {
                dispatch(obtenerPersonalizacionThunk({ access }));
                setIsChanging(false);
            }
        } catch (error: any) {
            toast.error(error.response.data, {
                toastId: 'Error en StyledButton al actualizar tema',
            });
            setIsChanging(false);
        }
    };

    const handeClick = async () => {
        if (!asideStatus) {
            if (darkModeStatus === DARK_MODE.DARK) {
                setDarkModeStatus(DARK_MODE.LIGHT);
                actualizarTema('1');
            } else if (darkModeStatus === DARK_MODE.LIGHT) {
                setDarkModeStatus(DARK_MODE.SYSTEM);
                actualizarTema('3');
            } else {
                setDarkModeStatus(DARK_MODE.DARK);
                actualizarTema('2');
            }
        } else {
            setDarkModeStatus(status);
            if (status === 'system') {
                actualizarTema('3');
            } else if (status === 'dark') {
                actualizarTema('2');
            } else {
                actualizarTema('1');
            }
        }
    };

    if (!asideStatus && darkModeStatus !== status) return null;
    return (
        <button
            type='button'
            disabled={isChanging}
            aria-label={`${text} Mode`}
            className={classNames(
                'p-1.5',
                'rounded-full',
                'text-zinc-500 dark:hover:text-zinc-100',
                'flex flex-auto items-center justify-center',
                'truncate',
                {
                    'bg-white shadow-lg dark:bg-zinc-800 dark:text-white':
                        darkModeStatus === status,
                    'hover:text-zinc-950': darkModeStatus !== status,
                },
                themeConfig.transition,
            )}
            onClick={handeClick}>
            <Icon
                icon={icon}
                className={classNames('text-xl', {
                    'ltr:mr-1.5 rtl:ml-1.5': asideStatus,
                })}
            />
            {asideStatus && (
                <span className='overflow-hidden truncate whitespace-nowrap'>{text}</span>
            )}
        </button>
    );
};
const DarkModeSwitcherPart = () => {
    const { t } = useTranslation();
    return (
        <div className='flex w-full overflow-hidden rounded-full bg-zinc-100 p-2 text-sm dark:bg-zinc-950'>
            <StyledButton icon='HeroMoon' status={DARK_MODE.DARK} text={t('theme.dark')} />
            <StyledButton icon='HeroSun' status={DARK_MODE.LIGHT} text={t('theme.light')} />
            <StyledButton
                icon='HeroComputerDesktop'
                status={DARK_MODE.SYSTEM}
                text={t('theme.system')}
            />
        </div>
    );
};

export default DarkModeSwitcherPart;
