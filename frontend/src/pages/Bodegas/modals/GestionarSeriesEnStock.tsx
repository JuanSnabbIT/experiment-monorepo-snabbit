import Input from '@/components/form/Input';
import Validation from '@/components/form/Validation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import { IStockItemEnBodega } from '@/interface/bodega.interface';
import {
    useAgregarSerieStockMutation,
    useEliminarSerieStockMutation,
    useGetOrdenesCompraDeStockQuery,
} from '@/store/slices/bodega/guiaSalidaApi';
import { useFormik } from 'formik';
import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import * as Yup from 'yup';

interface IGestionarSeriesEnStockProps {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    stockItem: IStockItemEnBodega | undefined;
}

const GestionarSeriesEnStock = ({
    isOpen,
    setIsOpen,
    stockItem,
}: IGestionarSeriesEnStockProps) => {
    const [agregarSerie, { isLoading: isAdding }] = useAgregarSerieStockMutation();
    const [eliminarSerie, { isLoading: isDeleting }] = useEliminarSerieStockMutation();
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    const { data: listaComprasDeStock = [] } = useGetOrdenesCompraDeStockQuery(
        {
            id_bodega: stockItem?.bodega!,
            id_stock: stockItem?.id!,
        },
        { skip: !stockItem || !isOpen },
    );

    // Obtener todas las series (disponibles y ocupadas) para mostrar la lista completa
    const seriesActuales = useMemo(() => {
        const lista: { serie: string; disponible: boolean }[] = [];
        listaComprasDeStock.forEach((stock) => {
            if (stock.numeros_serie?.numeros_serie?.length > 0) {
                stock.numeros_serie.numeros_serie.forEach((num: any) => {
                    lista.push({
                        serie: num.serie,
                        disponible: num.object_id === 0 && num.modelo.length === 0,
                    });
                });
            }
        });
        return lista;
    }, [listaComprasDeStock]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            serie: '',
        },
        validationSchema: Yup.object().shape({
            serie: Yup.string().required('Requerido').trim(),
        }),
        onSubmit: async (values) => {
            if (!stockItem) return;
            try {
                await agregarSerie({
                    id_bodega: stockItem.bodega,
                    id_stock: stockItem.id,
                    serie: values.serie.trim(),
                }).unwrap();
                toast.success('Serie agregada correctamente', { autoClose: 1000 });
                formik.resetForm();
            } catch (error: any) {
                toast.error(error.data?.detail || 'Error al agregar serie');
            }
        },
    });

    const handleEliminar = async (serie: string) => {
        if (!stockItem) return;
        try {
            await eliminarSerie({
                id_bodega: stockItem.bodega,
                id_stock: stockItem.id,
                serie,
            }).unwrap();
            toast.success('Serie eliminada', { autoClose: 1000 });
            setConfirmDelete(null);
        } catch (error: any) {
            toast.error(error.data?.detail || 'Error al eliminar serie');
            setConfirmDelete(null);
        }
    };

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} isScrollable fullScreen='lg'>
            <ModalHeader>
                <Badge className='text-xl'>
                    Series — {stockItem?.datos_item?.nombre || 'Item'}
                </Badge>
            </ModalHeader>
            <ModalBody>
                <div className='flex flex-col gap-4'>
                    {/* Formulario para agregar nueva serie */}
                    <div className='flex flex-row items-end gap-2'>
                        <div className='flex-1'>
                            <Badge>Nuevo N° de Serie</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.serie}
                                invalidFeedback={formik.errors.serie}>
                                <Input
                                    name='serie'
                                    placeholder='Ingrese número de serie'
                                    value={formik.values.serie}
                                    onChange={formik.handleChange}
                                    onBlur={formik.handleBlur}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            formik.handleSubmit();
                                        }
                                    }}
                                />
                            </Validation>
                        </div>
                        <Button
                            variant='solid'
                            color='emerald'
                            icon='HeroPlus'
                            isDisable={isAdding}
                            onClick={() => formik.handleSubmit()}>
                            Agregar
                        </Button>
                    </div>

                    {/* Lista de series existentes */}
                    {seriesActuales.length > 0 ? (
                        <div>
                            <Badge className='mb-2'>
                                Series registradas ({seriesActuales.length})
                            </Badge>
                            <ul className='flex flex-col gap-1'>
                                {seriesActuales.map((item, index) => (
                                    <li
                                        key={`${item.serie}-${index}`}
                                        className='flex items-center justify-between rounded border p-2 dark:border-zinc-600'>
                                        <div className='flex items-center gap-2'>
                                            <span className='font-mono text-sm'>{item.serie}</span>
                                            {!item.disponible && (
                                                <Badge
                                                    color='amber'
                                                    variant='outline'
                                                    className='text-xs'>
                                                    Asignada
                                                </Badge>
                                            )}
                                        </div>
                                        {item.disponible && (
                                            <div>
                                                {confirmDelete === item.serie ? (
                                                    <div className='flex gap-1'>
                                                        <Button
                                                            size='xs'
                                                            color='red'
                                                            variant='solid'
                                                            isDisable={isDeleting}
                                                            onClick={() =>
                                                                handleEliminar(item.serie)
                                                            }>
                                                            Confirmar
                                                        </Button>
                                                        <Button
                                                            size='xs'
                                                            color='zinc'
                                                            onClick={() => setConfirmDelete(null)}>
                                                            Cancelar
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Tooltip text='Eliminar serie'>
                                                        <Button
                                                            size='xs'
                                                            color='red'
                                                            variant='outline'
                                                            icon='HeroTrash'
                                                            onClick={() =>
                                                                setConfirmDelete(item.serie)
                                                            }
                                                        />
                                                    </Tooltip>
                                                )}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <div className='text-center text-zinc-500 dark:text-zinc-400'>
                            Este item no tiene series registradas.
                        </div>
                    )}
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild></ModalFooterChild>
                <ModalFooterChild>
                    <Button
                        color='zinc'
                        onClick={() => {
                            setIsOpen(false);
                            formik.resetForm();
                            setConfirmDelete(null);
                        }}>
                        Cerrar
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
};

export default GestionarSeriesEnStock;
