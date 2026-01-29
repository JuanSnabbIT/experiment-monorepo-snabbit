import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';

import Button from '@/components/ui/Button.tsx';
import Card, { CardBody } from '@/components/ui/Card.tsx';
import Container from '@/components/layouts/Container/Container.tsx';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper.tsx';
import Subheader, {
    SubheaderLeft,
    SubheaderRight,
} from '@/components/layouts/Subheader/Subheader.tsx';
import Badge from '@/components/ui/Badge.tsx';
import Icon from '@/components/icon/Icon.tsx';
import Tooltip from '@/components/ui/Tooltip.tsx';
import { useAppDispatch, useAppSelector } from '@/store/index.ts';
import { detalleVoucherThunk } from '@/store/index.ts';
import { downloadVoucherDevolucionPdf } from '@/utils/downloadHelpers.ts';

const DetalleVoucherDevolucion = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { detalleVoucher, loading, error } = useAppSelector((state) => state.bodega);

    useEffect(() => {
        if (!id) {
            navigate('/bodega/lista-vouchers-devolucion');
            return;
        }

        const voucherId = parseInt(id, 10);
        if (isNaN(voucherId)) {
            navigate('/bodega/lista-vouchers-devolucion');
            return;
        }

        void dispatch(detalleVoucherThunk(voucherId));
    }, [id, dispatch, navigate]);

    const handleDescargarPDF = async () => {
        if (!detalleVoucher) return;

        try {
            await downloadVoucherDevolucionPdf(detalleVoucher.id);
            toast.success(`PDF '${detalleVoucher.numero}' descargado correctamente`);
        } catch (err: unknown) {
            const anyErr = err as { message?: string };
            toast.error(anyErr?.message || 'Error al descargar PDF');
        }
    };

    const handleVolver = () => {
        navigate('/bodega/lista-vouchers-devolucion');
    };

    if (loading) {
        return (
            <PageWrapper isProtectedRoute name='Detalle Voucher Devolución' title='Cargando...'>
                <div className='flex items-center justify-center py-12'>
                    <div className='text-center'>
                        <Icon
                            icon='HeroEllipsisHorizontal'
                            className='mx-auto h-8 w-8 animate-spin text-blue-500'
                        />
                        <p className='mt-2 text-gray-600'>Cargando detalle del voucher...</p>
                    </div>
                </div>
            </PageWrapper>
        );
    }

    if (error) {
        return (
            <PageWrapper isProtectedRoute name='Detalle Voucher Devolución' title='Error'>
                <Container>
                    <Card>
                        <CardBody>
                            <div className='rounded-lg bg-red-50 p-4'>
                                <p className='text-red-800'>{error}</p>
                                <Button
                                    onClick={handleVolver}
                                    color='red'
                                    variant='outline'
                                    className='mt-4'>
                                    Volver
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                </Container>
            </PageWrapper>
        );
    }

    if (!detalleVoucher) {
        return (
            <PageWrapper isProtectedRoute name='Detalle Voucher Devolución' title='No encontrado'>
                <Container>
                    <Card>
                        <CardBody>
                            <div className='rounded-lg bg-yellow-50 p-4'>
                                <p className='text-yellow-800'>El voucher no fue encontrado</p>
                                <Button
                                    onClick={handleVolver}
                                    color='amber'
                                    variant='outline'
                                    className='mt-4'>
                                    Volver
                                </Button>
                            </div>
                        </CardBody>
                    </Card>
                </Container>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper
            isProtectedRoute
            name='Detalle Voucher Devolución'
            title={`Voucher ${detalleVoucher.numero}`}>
            <Subheader>
                <SubheaderLeft>
                    <Badge>Voucher de Devolución</Badge>
                    <h1 className='text-xl font-bold text-gray-800'>{detalleVoucher.numero}</h1>
                </SubheaderLeft>
                <SubheaderRight>
                    <Tooltip text='Descargar PDF'>
                        <Button
                            icon='HeroArrowDownTray'
                            color='emerald'
                            variant='solid'
                            onClick={handleDescargarPDF}>
                            Descargar PDF
                        </Button>
                    </Tooltip>
                    <Button
                        icon='HeroArrowLeft'
                        color='gray'
                        variant='outline'
                        onClick={handleVolver}>
                        Volver
                    </Button>
                </SubheaderRight>
            </Subheader>

            <Container>
                {/* Información General */}
                <Card>
                    <CardBody>
                        <h2 className='mb-4 text-lg font-semibold text-gray-800'>
                            Información General
                        </h2>
                        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                            <div className='rounded-lg border border-gray-200 p-3'>
                                <p className='text-sm text-gray-600'>Número de Voucher</p>
                                <p className='mt-1 font-semibold text-gray-900'>
                                    {detalleVoucher.numero}
                                </p>
                            </div>
                            <div className='rounded-lg border border-gray-200 p-3'>
                                <p className='text-sm text-gray-600'>Orden de Trabajo</p>
                                <p className='mt-1 font-semibold text-blue-600'>
                                    OT #{detalleVoucher.orden_trabajo}
                                </p>
                            </div>
                            <div className='rounded-lg border border-gray-200 p-3'>
                                <p className='text-sm text-gray-600'>Fecha de Creación</p>
                                <p className='mt-1 font-semibold text-gray-900'>
                                    {dayjs(detalleVoucher.fecha_creacion).format('DD/MM/YYYY')}
                                </p>
                            </div>
                        </div>

                        <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
                            <div className='rounded-lg border border-gray-200 p-3'>
                                <p className='text-sm text-gray-600'>Items Devueltos</p>
                                <p className='mt-1 flex items-center gap-2 text-gray-900'>
                                    <Badge color='blue' variant='solid'>
                                        {detalleVoucher.total_items_devueltos ?? 0}
                                    </Badge>
                                    <span className='font-semibold'>
                                        {detalleVoucher.total_items_devueltos === 1
                                            ? 'item'
                                            : 'items'}
                                    </span>
                                </p>
                            </div>
                            {detalleVoucher.observaciones && (
                                <div className='rounded-lg border border-gray-200 p-3'>
                                    <p className='text-sm text-gray-600'>Observaciones</p>
                                    <p className='mt-1 font-semibold text-gray-900'>
                                        {detalleVoucher.observaciones}
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardBody>
                </Card>

                {/* Movimientos Agrupados */}
                {detalleVoucher.movimientos_agrupados &&
                    detalleVoucher.movimientos_agrupados.length > 0 && (
                        <Card>
                            <CardBody>
                                <h2 className='mb-4 text-lg font-semibold text-gray-800'>
                                    Movimientos
                                </h2>
                                <div className='space-y-4'>
                                    {detalleVoucher.movimientos_agrupados.map(
                                        (grupo, idx: number) => (
                                            <div
                                                key={idx}
                                                className='rounded-lg border border-gray-200 p-4'>
                                                <div className='mb-3 flex items-center justify-between'>
                                                    <h3 className='font-semibold text-gray-900'>
                                                        {grupo.origen_nombre || `Grupo ${idx + 1}`}
                                                    </h3>
                                                    <Badge color='blue' variant='outline'>
                                                        {grupo.cantidad}{' '}
                                                        {grupo.cantidad === 1 ? 'item' : 'items'}
                                                    </Badge>
                                                </div>

                                                {grupo.movimientos &&
                                                    grupo.movimientos.length > 0 && (
                                                        <div className='space-y-2'>
                                                            {grupo.movimientos.map(
                                                                (mov, movIdx: number) => (
                                                                    <div
                                                                        key={movIdx}
                                                                        className='flex items-center justify-between rounded-md bg-gray-50 p-2 text-sm'>
                                                                        <div>
                                                                            <p className='font-semibold text-gray-900'>
                                                                                {mov.item_nombre ||
                                                                                    `Item #${mov.item_id}`}
                                                                            </p>
                                                                            {mov.descripcion && (
                                                                                <p className='text-xs text-gray-600'>
                                                                                    {
                                                                                        mov.descripcion
                                                                                    }
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        <p className='font-semibold text-gray-900'>
                                                                            {mov.cantidad}
                                                                        </p>
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    )}
                                            </div>
                                        ),
                                    )}
                                </div>
                            </CardBody>
                        </Card>
                    )}

                {/* Sin movimientos */}
                {(!detalleVoucher.movimientos_agrupados ||
                    detalleVoucher.movimientos_agrupados.length === 0) && (
                    <Card>
                        <CardBody>
                            <div className='rounded-lg bg-yellow-50 p-4'>
                                <p className='text-yellow-800'>
                                    No hay movimientos registrados para este voucher
                                </p>
                            </div>
                        </CardBody>
                    </Card>
                )}
            </Container>
        </PageWrapper>
    );
};

export default DetalleVoucherDevolucion;
