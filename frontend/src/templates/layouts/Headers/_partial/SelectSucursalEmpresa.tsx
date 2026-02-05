import SelectReact, { TSelectGroups, TSelectOption } from '@/components/form/SelectReact';
import AuthorityCheckNav from '@/components/layouts/AuthorityCheckNav/AuthorityCheckNav';
import ApiService from '@/services/ApiService';
import { obtenerPersonalizacionThunk, useAppDispatch, useAppSelector } from '@/store';
import { selectEmpresasThunk } from '@/store/slices/empresa/empresaSlice';
import themeConfig from '@/config/theme.config';
import classNames from 'classnames';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { AnimatePresence, motion } from 'framer-motion';
import useAsideStatus from '@/hooks/useAsideStatus';
import getFirstLetter from '@/utils/getFirstLetter';
import useRoundedSize from '@/hooks/useRoundedSize';
import { getErrorMessage } from '@/utils/errorHandlers';

function SelectSucursalEmpresa() {
    const dispatch = useAppDispatch();
    const { personalizacionUsuario, access, isAuthenticated, listaGrupos } = useAppSelector(
        (state) => state.auth,
    );
    const { selectEmpresas } = useAppSelector((state) => state.empresa);
    const [optionsEmpresas, setOptionsEmpresas] = useState<TSelectGroups>([]);
    const [selectedSucursal, setSelectedSucursal] = useState<{
        value: string;
        label: string;
    } | null>(null);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const { asideStatus } = useAsideStatus();
    const { roundedCustom } = useRoundedSize('rounded-xl');
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (isAuthenticated) {
            dispatch(selectEmpresasThunk());
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDown = (event: PointerEvent) => {
            const container = containerRef.current;
            if (!container) return;
            if (event.target instanceof Node && !container.contains(event.target)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    useEffect(() => {
        setOptionsEmpresas(
            selectEmpresas.map((emp) => {
                return {
                    label: emp.nombre,
                    options: emp.sucursales.map((suc) => {
                        return {
                            value: suc.id.toString(),
                            label: `${emp.nombre} / ${suc.nombre} / ${suc.direccion || 'Sin Dirección'}`,
                        };
                    }),
                };
            }),
        );
    }, [selectEmpresas]);

    useEffect(() => {
        if (
            personalizacionUsuario &&
            personalizacionUsuario.sucursal_principal &&
            optionsEmpresas.length > 0
        ) {
            // Buscar el label correspondiente al id de sucursal_principal
            for (const group of optionsEmpresas) {
                const sucursal = group.options.find(
                    (option) =>
                        option.value === personalizacionUsuario.sucursal_principal!.toString(),
                );
                if (sucursal) {
                    setSelectedSucursal(sucursal);
                    break;
                }
            }
        }
    }, [personalizacionUsuario?.sucursal_principal, optionsEmpresas]);

    // Extraer nombre de empresa y sucursal del label
    const getNombreEmpresa = () => {
        if (!selectedSucursal) return 'Empresa';
        const parts = selectedSucursal.label.split(' / ');
        return parts[0] || 'Empresa';
    };

    const getNombreSucursal = () => {
        if (!selectedSucursal) return 'Seleccione sucursal';
        const parts = selectedSucursal.label.split(' / ');
        return parts[1] || 'Sucursal';
    };

    return (
        <div className='relative w-full' ref={containerRef}>
            {listaGrupos && (
                <AuthorityCheckNav
                    authority={['staff', 'superadmin']}
                    userAuthority={listaGrupos.grupos}>
                    <>
                        <AnimatePresence>
                            {isOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                    transition={{ duration: 0.15 }}
                                    className={classNames(
                                        'absolute z-50 w-[18rem] max-w-[calc(100vw-3rem)]',
                                        {
                                            'bottom-full mb-2 ltr:left-0 rtl:right-0': asideStatus,
                                            'bottom-0 ltr:left-full ltr:ml-3 rtl:right-full rtl:mr-3':
                                                !asideStatus,
                                        },
                                        {
                                            'ltr:translate-x-[-0.625rem] rtl:translate-x-[0.625rem]':
                                                !asideStatus,
                                        },
                                    )}>
                                    <div className='rounded-xl bg-zinc-100 p-3 shadow-2xl dark:bg-zinc-950'>
                                        <SelectReact
                                            className='w-full'
                                            noOptionsMessage={() => 'Sin Opciones'}
                                            placeholder='Selecciona Sucursal'
                                            dimension='sm'
                                            name='select_empresa'
                                            value={selectedSucursal}
                                            options={optionsEmpresas}
                                            menuPlacement='top'
                                            maxMenuHeight={220}
                                            onChange={async (e) => {
                                                try {
                                                    const response = await ApiService.fetchData({
                                                        url: `/api/personalizacion-usuarios/${personalizacionUsuario?.id}/`,
                                                        method: 'patch',
                                                        headers: {
                                                            'Content-Type':
                                                                'application/json',
                                                        },
                                                        data: JSON.stringify({
                                                            sucursal_principal: parseInt(
                                                                (e as TSelectOption)?.value,
                                                            ),
                                                        }),
                                                    });
                                                    if (response.data) {
                                                        dispatch(
                                                            obtenerPersonalizacionThunk(),
                                                        );
                                                        setIsOpen(false);
                                                    }
                                                } catch (error: unknown) {
                                                    toast.error(getErrorMessage(error));
                                                }
                                            }}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div
                            className={classNames(
                                'mb-2 min-w-[4.5rem] overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-950',
                                {
                                    'ltr:translate-x-[-0.625rem] rtl:translate-x-[0.625rem]':
                                        !asideStatus,
                                },
                                themeConfig.transition,
                            )}>
                            <div
                                className={classNames(
                                    'flex cursor-pointer gap-3 p-3',
                                    'text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-100',
                                    'transition-all duration-300 ease-in-out',
                                )}
                                onClick={() => setIsOpen((prevState) => !prevState)}
                                role='presentation'>
                                <div
                                    className={classNames(
                                        'flex h-12 w-12 shrink-0 items-center justify-center bg-emerald-500/20 text-emerald-500',
                                        [`${roundedCustom(-2)}`],
                                    )}>
                                    {getNombreEmpresa() && getFirstLetter(getNombreEmpresa(), 1)}
                                </div>
                                {asideStatus && (
                                    <div className='flex basis-full flex-wrap items-center truncate'>
                                        <div className='flex basis-full items-center gap-2 truncate'>
                                            <span className='truncate font-semibold'>
                                                {getNombreEmpresa()}
                                            </span>
                                        </div>
                                        <div className='basis-full truncate text-xs'>
                                            {getNombreSucursal()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                </AuthorityCheckNav>
            )}
        </div>
    );
}

export default SelectSucursalEmpresa;
