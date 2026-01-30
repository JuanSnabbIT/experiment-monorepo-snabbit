import Input from '@/components/form/Input';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import { IItemGuiaSalida } from '@/interface/bodega.interface';
import {
    useDevolverABodegaMutation,
    useGetDetalleGuiaSalidaQuery,
    useGetItemsGuiaSalidaQuery,
} from '@/store/slices/bodega/guiaSalidaApi';
import { Fragment, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

function DevolucionParcialGuiaSalidaBodega() {
    const navigate = useNavigate();
    const { id } = useParams();

    // Queries
    const { data: listaItemsEnGuiaSalidaBodega = [] } = useGetItemsGuiaSalidaQuery(id!, {
        skip: !id,
    });
    const { data: detalleGuiaSalidaBodega } = useGetDetalleGuiaSalidaQuery(id!, { skip: !id });

    // Mutation
    const [devolverABodega] = useDevolverABodegaMutation();

    const [itemsGuia, setItemsGuia] = useState<
        { item: IItemGuiaSalida; item_guia_id: number; cantidad_a_devolver: number }[]
    >([]);
    const [itemSelected, setItemSelected] = useState<number | undefined>();
    const [mensajeError, setMensajeError] = useState<string>('');

    useEffect(() => {
        if (listaItemsEnGuiaSalidaBodega.length > 0) {
            setItemsGuia(
                listaItemsEnGuiaSalidaBodega.map((item) => {
                    return {
                        item: item,
                        item_guia_id: item.id,
                        cantidad_a_devolver: item.cantidad_rebajada,
                    };
                }),
            );
        }
    }, [listaItemsEnGuiaSalidaBodega]);

    return (
        <PageWrapper
            isProtectedRoute={true}
            name='Devolucion Parcial Rebaja Bodega'
            title='Devolucion Parcial Rebaja Bodega'>
            <Subheader>
                <SubheaderLeft>
                    <Badge className='text-xl'>Devolucion Parcial a Bodega</Badge>
                </SubheaderLeft>
            </Subheader>
            <Container className='h-full w-full'>
                <div className='flex'>
                    <div className='w-full'>
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge className='text-xl'>Items en Rebaja de Bodega</Badge>
                                </CardHeaderChild>
                                <CardHeaderChild>
                                    <Button
                                        variant='solid'
                                        isDisable={itemSelected ? true : false}
                                        onClick={async () => {
                                            if (
                                                itemsGuia.every(
                                                    (item) => item.cantidad_a_devolver === 0,
                                                )
                                            ) {
                                                toast.error(
                                                    'No se puede completar la devolución si todas las cantidades a devolver son 0',
                                                );
                                            } else {
                                                try {
                                                    await devolverABodega({
                                                        id: id!,
                                                        items: itemsGuia.map((item) => ({
                                                            item_guia_id: item.item_guia_id,
                                                            cantidad_a_devolver:
                                                                item.cantidad_a_devolver,
                                                        })),
                                                    }).unwrap();
                                                    toast.success(
                                                        'Guia de salida devuelta de manera parcial',
                                                        { autoClose: 1000 },
                                                    );
                                                    navigate(`/bodega/lista-guia-salida`);
                                                } catch (error: any) {
                                                    toast.error(
                                                        error.data?.detail ||
                                                            'Error al completar la devolución',
                                                    );
                                                }
                                            }
                                        }}>
                                        Completar Rebaja Parcial
                                    </Button>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <div className={`grid grid-cols-4`}>
                                    <div className='col-span-1 border'>
                                        <Badge>Item</Badge>
                                    </div>
                                    <div className='col-span-1 border'>
                                        <Badge>Cantidad Rebajada</Badge>
                                    </div>
                                    <div className='col-span-1 border'>
                                        <Badge>Cantidad a Devolver</Badge>
                                    </div>
                                    <div className='col-span-1 border'>
                                        <Badge>Acciones</Badge>
                                    </div>
                                    {itemsGuia.map((item, index) => (
                                        <Fragment key={index}>
                                            <div className='col-span-1 border p-2'>
                                                <div className='ml-4 flex flex-col'>
                                                    <div className='w-full'>
                                                        {item.item.datos_stock.datos_item.nombre}
                                                    </div>
                                                    {/* <div className="w-full text-xs ml-2 flex gap-1">
                                                        <Icon icon="DuoPenRuler" size="text-base" /> {item.item.datos_stock.datos_item.tamanio} {item.item.datos_stock.datos_item.unidad_label}
                                                    </div> */}
                                                    <div className='mt-2 w-full'>
                                                        <Button
                                                            size='xs'
                                                            className='!px-1'
                                                            icon='DuoBox3'
                                                            onClick={() => {
                                                                if (
                                                                    item.item.datos_stock.datos_item
                                                                        .fabricante
                                                                )
                                                                    navigate(
                                                                        `/registros/detalle-fabricante/${item.item.datos_stock.datos_item.fabricante}`,
                                                                    );
                                                            }}>
                                                            {item.item.datos_stock.datos_item
                                                                .datos_fabricante?.nombre ||
                                                                'Sin Fabricante'}
                                                        </Button>
                                                    </div>
                                                    <div className='w-full'>
                                                        <Button
                                                            size='xs'
                                                            className='!px-1'
                                                            icon='DuoAlignJustify'
                                                            onClick={() => {
                                                                if (
                                                                    item.item.datos_stock.datos_item
                                                                        .categoria
                                                                )
                                                                    navigate(
                                                                        `/registros/detalle-categoria/${item.item.datos_stock.datos_item.categoria}`,
                                                                    );
                                                            }}>
                                                            {item.item.datos_stock.datos_item
                                                                .datos_categoria?.nombre ||
                                                                'Sin Categoria'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className='col-span-1 border p-2'>
                                                <div className='ml-4'>
                                                    {item.item.cantidad_rebajada}
                                                </div>
                                            </div>
                                            <div className='col-span-1 border p-2'>
                                                {itemSelected === item.item_guia_id ? (
                                                    <Input
                                                        name='cantidad_a_devolver'
                                                        type='number'
                                                        max={item.item.cantidad_rebajada}
                                                        value={item.cantidad_a_devolver}
                                                        onChange={(e) => {
                                                            if (
                                                                parseInt(e.target.value) >
                                                                item.item.cantidad_rebajada
                                                            ) {
                                                                setMensajeError(
                                                                    `La cantidad a devolver (${e.target.value}) no puede ser mayor a la cantidad ya sacada (${item.item.cantidad_rebajada})`,
                                                                );
                                                            } else if (
                                                                parseInt(e.target.value) < 0
                                                            ) {
                                                                setMensajeError(
                                                                    `La cantidad a devolver (${e.target.value}) no puede ser negativa`,
                                                                );
                                                            } else {
                                                                setItemsGuia((prevItems) =>
                                                                    prevItems.map(
                                                                        (prevItem, idx) =>
                                                                            idx === index
                                                                                ? {
                                                                                      ...prevItem,
                                                                                      cantidad_a_devolver:
                                                                                          parseInt(
                                                                                              e
                                                                                                  .target
                                                                                                  .value,
                                                                                          ),
                                                                                  }
                                                                                : prevItem,
                                                                    ),
                                                                );
                                                            }
                                                        }}
                                                        invalidFeedback={mensajeError}
                                                        isValid={mensajeError.length === 0}
                                                    />
                                                ) : (
                                                    <div className='ml-4'>
                                                        {item.cantidad_a_devolver}
                                                    </div>
                                                )}
                                            </div>
                                            <div className='col-span-1 border'>
                                                {itemSelected === item.item_guia_id ? (
                                                    <div>
                                                        <Button
                                                            className='m-2'
                                                            color='red'
                                                            variant='solid'
                                                            onClick={() => {
                                                                setItemsGuia((prevItems) =>
                                                                    prevItems.map(
                                                                        (prevItem, idx) =>
                                                                            idx === index
                                                                                ? {
                                                                                      ...prevItem,
                                                                                      cantidad_a_devolver:
                                                                                          prevItem
                                                                                              .item
                                                                                              .cantidad_rebajada,
                                                                                  }
                                                                                : prevItem,
                                                                    ),
                                                                );
                                                                setItemSelected(undefined);
                                                            }}>
                                                            Cancelar
                                                        </Button>
                                                        <Button
                                                            className='m-2'
                                                            variant='solid'
                                                            onClick={() =>
                                                                setItemSelected(undefined)
                                                            }>
                                                            Guardar
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <Button
                                                            className='m-2'
                                                            variant='solid'
                                                            onClick={() =>
                                                                setItemSelected(item.item_guia_id)
                                                            }>
                                                            Editar
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </Fragment>
                                    ))}
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </Container>
        </PageWrapper>
    );
}

export default DevolucionParcialGuiaSalidaBodega;
