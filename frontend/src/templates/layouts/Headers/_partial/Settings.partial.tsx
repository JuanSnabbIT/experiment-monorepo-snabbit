import Dropdown, {
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
} from '../../../../components/ui/Dropdown';
import Button from '../../../../components/ui/Button';
import ButtonGroup from '../../../../components/ui/ButtonGroup';
import DARK_MODE from '../../../../constants/darkMode.constant';
import useFontSize from '../../../../hooks/useFontSize';
import useDarkMode from '../../../../hooks/useDarkMode';
import { obtenerPersonalizacionThunk, useAppDispatch, useAppSelector } from '@/store';
import ApiService from '@/services/ApiService';
import { toast } from 'react-toastify';
import { useEffect, useMemo, useState } from 'react';

const SettingsPartial = () => {
    const dispatch = useAppDispatch();
    const { fontSize, setFontSize } = useFontSize();
    const { darkModeStatus, setDarkModeStatus } = useDarkMode();
    const { personalizacionUsuario, access } = useAppSelector((state) => state.auth);
    const [isChanging, setIsChanging] = useState<boolean>(false);

    return (
        <Dropdown>
            <DropdownToggle hasIcon={false}>
                <Button icon='HeroCog8Tooth' aria-label='Settings' />
            </DropdownToggle>
            <DropdownMenu placement='bottom-end'>
                <DropdownItem className='flex flex-col !items-start'>
                    <div>Tamaño de Fuente:</div>
                    <ButtonGroup>
                        <Button
                            icon='HeroMinus'
                            onClick={async () => {
                                setFontSize(fontSize - 1);
                                try {
                                    const response = await ApiService.fetchData({
                                        url: `/api/personalizacion-usuarios/${personalizacionUsuario?.id}/`,
                                        method: 'patch',
                                        headers: { 'Content-Type': 'application/json' },
                                        data: JSON.stringify({ font_size: fontSize - 1 }),
                                    });
                                    if (response.data) {
                                        dispatch(obtenerPersonalizacionThunk({ access }));
                                    }
                                } catch (error: any) {
                                    toast.error(error.response.data.detail);
                                }
                            }}
                            isDisable={fontSize <= 12}
                        />
                        <Button isDisable>{fontSize}</Button>
                        <Button
                            icon='HeroPlus'
                            onClick={async () => {
                                setFontSize(fontSize + 1);
                                try {
                                    const response = await ApiService.fetchData({
                                        url: `/api/personalizacion-usuarios/${personalizacionUsuario?.id}/`,
                                        method: 'patch',
                                        headers: { 'Content-Type': 'application/json' },
                                        data: JSON.stringify({ font_size: fontSize + 1 }),
                                    });
                                    if (response.data) {
                                        dispatch(obtenerPersonalizacionThunk({ access }));
                                    }
                                } catch (error: any) {
                                    toast.error(error.response.data.detail);
                                }
                            }}
                            isDisable={fontSize >= 18}
                        />
                    </ButtonGroup>
                </DropdownItem>
                <DropdownItem className='flex flex-col !items-start'>
                    <div>Dark Mode:</div>
                    <ButtonGroup>
                        <Button
                            isDisable={isChanging}
                            icon='HeroMoon'
                            onClick={async () => {
                                setIsChanging(true);
                                setDarkModeStatus(DARK_MODE.DARK);
                                try {
                                    const response = await ApiService.fetchData({
                                        url: `/api/personalizacion-usuarios/${personalizacionUsuario?.id}/`,
                                        method: 'patch',
                                        headers: { 'Content-Type': 'application/json' },
                                        data: JSON.stringify({ tema: '2' }),
                                    });
                                    if (response.data) {
                                        dispatch(obtenerPersonalizacionThunk({ access }));
                                        setIsChanging(false);
                                    }
                                } catch (error: any) {
                                    toast.error(error);
                                    setIsChanging(false);
                                }
                            }}
                            isActive={darkModeStatus === DARK_MODE.DARK}
                        />
                        <Button
                            isDisable={isChanging}
                            icon='HeroSun'
                            onClick={async () => {
                                setIsChanging(true);
                                setDarkModeStatus(DARK_MODE.LIGHT);
                                try {
                                    const response = await ApiService.fetchData({
                                        url: `/api/personalizacion-usuarios/${personalizacionUsuario?.id}/`,
                                        method: 'patch',
                                        headers: { 'Content-Type': 'application/json' },
                                        data: JSON.stringify({ tema: '1' }),
                                    });
                                    if (response.data) {
                                        dispatch(obtenerPersonalizacionThunk({ access }));
                                        setIsChanging(false);
                                    }
                                } catch (error: any) {
                                    toast.error(error);
                                    setIsChanging(false);
                                }
                            }}
                            isActive={darkModeStatus === DARK_MODE.LIGHT}
                        />
                        <Button
                            isDisable={isChanging}
                            icon='HeroComputerDesktop'
                            onClick={async () => {
                                setIsChanging(true);
                                setDarkModeStatus(DARK_MODE.SYSTEM);
                                try {
                                    const response = await ApiService.fetchData({
                                        url: `/api/personalizacion-usuarios/${personalizacionUsuario?.id}/`,
                                        method: 'patch',
                                        headers: { 'Content-Type': 'application/json' },
                                        data: JSON.stringify({ tema: '3' }),
                                    });
                                    if (response.data) {
                                        dispatch(obtenerPersonalizacionThunk({ access }));
                                        setIsChanging(false);
                                    }
                                } catch (error: any) {
                                    toast.error(error);
                                    setIsChanging(false);
                                }
                            }}
                            isActive={darkModeStatus === DARK_MODE.SYSTEM}
                        />
                    </ButtonGroup>
                </DropdownItem>
            </DropdownMenu>
        </Dropdown>
    );
};

export default SettingsPartial;
