import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Validation from '@/components/form/Validation';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import { IItemGuiaSalida } from '@/interface/bodega.interface';
import {
    useActualizarSerieItemMutation,
    useGetOrdenesCompraDeStockQuery,
} from '@/store/slices/bodega/guiaSalidaApi';
import { useFormik } from 'formik';
import { Dispatch, SetStateAction, useMemo } from 'react';
import { toast } from 'react-toastify';

function AsignarNumeroDeSerie({
    isOpen,
    setIsOpen,
    itemRebajaSelected,
    setItemRebajaSelected,
}: {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    itemRebajaSelected: IItemGuiaSalida | undefined;
    setItemRebajaSelected: Dispatch<SetStateAction<IItemGuiaSalida | undefined>>;
}) {
    const [actualizarSerie] = useActualizarSerieItemMutation();
    const { data: listaComprasDeStock = [] } = useGetOrdenesCompraDeStockQuery(
        {
            id_bodega: itemRebajaSelected?.datos_stock.bodega!,
            id_stock: itemRebajaSelected?.datos_stock.id!,
        },
        { skip: !itemRebajaSelected || !isOpen },
    );

    const optionsNumeros = useMemo(() => {
        const lista: TSelectOption[] = [];
        listaComprasDeStock.forEach((stock) => {
            if (stock.numeros_serie.numeros_serie && stock.numeros_serie.numeros_serie.length > 0) {
                stock.numeros_serie.numeros_serie.forEach((num: any) => {
                    if (num.object_id === 0 && num.modelo.length === 0) {
                        lista.push({ value: num.serie, label: num.serie });
                    }
                });
            }
        });
        return lista;
    }, [listaComprasDeStock]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            numero_serie: '',
        },
        onSubmit: async (values) => {
            if (!itemRebajaSelected) return;
            try {
                await actualizarSerie({
                    id_guia: itemRebajaSelected.guia,
                    item_id: itemRebajaSelected.id,
                    serie: values.numero_serie,
                    id_bodega: itemRebajaSelected.datos_stock.bodega,
                    id_stock: itemRebajaSelected.datos_stock.id,
                }).unwrap();
                toast.success('Numero de serie asignado', { autoClose: 1000 });
                setIsOpen(false);
                setItemRebajaSelected(undefined);
            } catch (error: any) {
                toast.error(error.data || 'Error al actualizar la serie', {
                    toastId: 'Error al actualizar la serie',
                });
            }
        },
    });

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
            <ModalHeader>
                <Badge className='text-xl'>Asignar Numero de Serie</Badge>
            </ModalHeader>
            <ModalBody>
                <div className='w-full'>
                    <Badge>Numero de Serie</Badge>
                    <Validation
                        isValid={formik.isValid}
                        isTouched={formik.touched.numero_serie}
                        invalidFeedback={formik.errors.numero_serie}>
                        <SelectReact
                            name='numero_serie'
                            options={optionsNumeros}
                            placeholder='Seleccione un numero de serie'
                            noOptionsMessage={(e) => `No Existe ${e.inputValue}`}
                            onBlur={formik.handleBlur}
                            onChange={(e) => {
                                formik.setFieldValue('numero_serie', (e as TSelectOption).value);
                            }}
                        />
                    </Validation>
                </div>
            </ModalBody>
            <ModalFooter>
                <ModalFooterChild></ModalFooterChild>
                <ModalFooterChild>
                    <Button
                        color='zinc'
                        onClick={() => {
                            setIsOpen(false);
                            setItemRebajaSelected(undefined);
                        }}>
                        Cancelar
                    </Button>
                    <Button
                        variant='solid'
                        color='emerald'
                        onClick={() => {
                            formik.handleSubmit();
                        }}>
                        Guardar
                    </Button>
                </ModalFooterChild>
            </ModalFooter>
        </Modal>
    );
}

export default AsignarNumeroDeSerie;
