import Input from '@/components/form/Input';
import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import Collapse from '@/components/utils/Collapse';
import { IStockItemEnBodega } from '@/interface/bodega.interface';
import ApiService from '@/services/ApiService';
import {
    detalleBodegaThunk,
    listaStockItemsEnBodegaThunk,
    listaUsuariosDeMisClientesThunk,
    listaUsuariosTodaLaEmpresaThunk,
    useAppDispatch,
    useAppSelector,
    usuarioEmpresaLogeadoThunk,
} from '@/store';
import TableCardFooterTemplateV2 from '@/templates/Table/TableFooterTemplateV2';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    SortingState,
    useReactTable,
} from '@tanstack/react-table';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as Yup from 'yup';
import CrearGuiaSalidaEnDetalleBodega from '../modals/CrearGuiaSalidaEnDetalleBodega';
import CrearMovimientoStockAjusteEnBodega from '../modals/CrearMovimientoStockAjusteEnBodega';
import GestionarSeriesEnStock from '../modals/GestionarSeriesEnStock';

const columnHelper = createColumnHelper<IStockItemEnBodega>();

function DetalleBodega() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { id } = useParams();
    const { personalizacionUsuario, userMe } = useAppSelector((state) => state.auth);
    const { detalleBodega, listaStockItemsEnBodega } = useAppSelector((state) => state.bodega);
    const [isEditting, setIsEditting] = useState<boolean>(false);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [isOpenSalida, setIsOpenSalida] = useState<boolean>(false);
    const [isOpenSeries, setIsOpenSeries] = useState<boolean>(false);
    const [stockItemSeries, setStockItemSeries] = useState<IStockItemEnBodega | undefined>();

    useEffect(() => {
        if (id) {
            dispatch(detalleBodegaThunk({ id_bodega: id }));
            dispatch(listaStockItemsEnBodegaThunk({ id_bodega: id }));
        }
    }, [id]);

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            nombre: '',
        },
        validationSchema: Yup.object().shape({
            nombre: Yup.string().required('Requerido').nonNullable('Requerido'),
        }),
        onSubmit: async (values) => {
            try {
                const response = await ApiService.fetchData({
                    url: `/api/bodegas/${detalleBodega?.id}/`,
                    method: 'patch',
                    headers: { 'Content-Type': 'application/json' },
                    data: JSON.stringify(values),
                });
                if (response.data) {
                    dispatch(detalleBodegaThunk({ id_bodega: id }));
                    formik.resetForm();
                    setIsEditting(false);
                }
            } catch (error: any) {
                toast.error(error.response.data);
            }
        },
    });

    const columns = [
        columnHelper.accessor('datos_item.nombre', {
            cell: (info) => info.getValue(),
            header: 'Nombre',
        }),
        columnHelper.accessor('cantidad', {
            cell: (info) => info.getValue(),
            header: 'Cantidad',
        }),
        columnHelper.accessor('pmp', {
            cell: (info) => info.getValue(),
            header: 'PMP',
        }),
        columnHelper.display({
            id: 'numeros_series',
            cell: (info) => {
                const [num, setNum] = useState<string | null>(null);
                const [isOpening, setIsOpening] = useState<boolean>(false);

                return (
                    <div>
                        <Button
                            isDisable={isOpening}
                            variant='solid'
                            icon={
                                num === info.row.original.id.toString()
                                    ? 'DuoAngleDown'
                                    : 'DuoAngleUp'
                            }
                            onClick={() => {
                                if (isOpening) return;

                                setIsOpening(true);
                                if (num === info.row.original.id.toString()) {
                                    setNum(null);
                                } else {
                                    setNum(info.row.original.id.toString());
                                }
                                setTimeout(() => setIsOpening(false), 300);
                            }}
                        />
                        <Collapse
                            isOpen={num === info.row.original.id.toString()}
                            className='transition-opacity'>
                            <ul className='list-inside list-disc'>
                                {info.row.original.numeros_series.map((numero, index) => (
                                    <li key={`${numero}-${index}`}>{numero}</li>
                                ))}
                            </ul>
                        </Collapse>
                    </div>
                );
            },
            header: 'N° de Serie',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => (
                <div className='flex flex-wrap gap-2'>
                    <Tooltip text='Ir al detalle del item en la empresa'>
                        <Button
                            variant='solid'
                            color='violet'
                            icon='HeroEye'
                            onClick={() => {
                                navigate(
                                    `/registros/detalle-item-empresa/${info.row.original.item}`,
                                );
                            }}></Button>
                    </Tooltip>
                    <Tooltip text='Gestionar N° de Serie'>
                        <Button
                            variant='solid'
                            color='blue'
                            icon='HeroHashtag'
                            onClick={() => {
                                setStockItemSeries(info.row.original);
                                setIsOpenSeries(true);
                            }}></Button>
                    </Tooltip>
                    <CrearMovimientoStockAjusteEnBodega item_stock={info.row.original} />
                </div>
            ),
            header: '',
        }),
    ];

    const table = useReactTable({
        data: listaStockItemsEnBodega,
        columns: columns,
        state: {
            sorting: sorting,
            globalFilter: globalFilter,
        },
        onSortingChange: setSorting,
        enableGlobalFilter: true,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    useEffect(() => {
        if (isOpenSalida && personalizacionUsuario && personalizacionUsuario.empresa) {
            dispatch(
                listaUsuariosDeMisClientesThunk({ id_empresa: personalizacionUsuario.empresa }),
            );
            dispatch(
                listaUsuariosTodaLaEmpresaThunk({ id_empresa: personalizacionUsuario.empresa }),
            );
            dispatch(usuarioEmpresaLogeadoThunk({ id_usuario: userMe?.pk }));
        }
    }, [isOpenSalida, personalizacionUsuario]);

    return (
        <PageWrapper isProtectedRoute={true} title='Detalle Bodega' name='Detalle Bodega'>
            <Subheader>
                <SubheaderLeft>{null}</SubheaderLeft>
                <SubheaderRight className='w-full md:w-auto'>
                    <CrearGuiaSalidaEnDetalleBodega
                        isOpen={isOpenSalida}
                        setIsOpen={setIsOpenSalida}
                        id_bodega={detalleBodega?.id}
                    />
                    <Tooltip text='Ver PDF'>
                        <Button
                            variant='solid'
                            color='red'
                            icon='HeroDocumentText'
                            onClick={async () => {
                                try {
                                    const response = await ApiService.fetchData<BlobPart>({
                                        url: `/api/bodegas/${id}/generar-pdf/`,
                                        method: 'get',
                                        headers: { 'Content-Type': 'application/pdf' },
                                    });
                                    const url = window.URL.createObjectURL(
                                        new Blob([response.data]),
                                    );
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `bodega_${id}.pdf`;
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                    window.URL.revokeObjectURL(url);
                                } catch (error: any) {
                                    toast.error(error.response.data);
                                }
                            }}
                        />
                    </Tooltip>
                    <Tooltip text='Ver PDF Resumido'>
                        <Button
                            variant='solid'
                            color='red'
                            icon='HeroDocumentText'
                            onClick={async () => {
                                try {
                                    const response = await ApiService.fetchData<BlobPart>({
                                        url: `/api/bodegas/${id}/generar-pdf-resumido/`,
                                        method: 'get',
                                        headers: { 'Content-Type': 'application/pdf' },
                                    });
                                    const url = window.URL.createObjectURL(
                                        new Blob([response.data]),
                                    );
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `bodega_${id}_resumido.pdf`;
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                    window.URL.revokeObjectURL(url);
                                } catch (error: any) {
                                    toast.error(error.response.data);
                                }
                            }}
                        />
                    </Tooltip>
                </SubheaderRight>
            </Subheader>
            <Container className='h-full w-full'>
                <div className='flex flex-col gap-4'>
                    <Card className='w-full'>
                        <CardHeader>
                            <CardHeaderChild>
                                <Badge className='text-xl'>Datos de Bodega</Badge>
                            </CardHeaderChild>
                            <CardHeaderChild>
                                {isEditting ? (
                                    <>
                                        <Button
                                            variant='solid'
                                            onClick={() => {
                                                formik.handleSubmit();
                                            }}>
                                            Guardar
                                        </Button>
                                        <Button
                                            variant='solid'
                                            color='red'
                                            onClick={() => {
                                                setIsEditting(false);
                                                formik.resetForm();
                                            }}>
                                            Cancelar
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        variant='solid'
                                        onClick={() => {
                                            setIsEditting(true);
                                            formik.setFieldValue('nombre', detalleBodega?.nombre);
                                        }}>
                                        Editar Nombre
                                    </Button>
                                )}
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody>
                            <div className='w-full'>
                                <Badge>Nombre</Badge>
                                {isEditting ? (
                                    <Input
                                        name='nombre'
                                        value={formik.values.nombre}
                                        onBlur={formik.handleBlur}
                                        onChange={formik.handleChange}
                                    />
                                ) : (
                                    <div className='ml-4'>{detalleBodega?.nombre}</div>
                                )}
                            </div>
                        </CardBody>
                    </Card>
                    <Card className='w-full'>
                        <CardHeader>
                            <CardHeaderChild>
                                <Badge className='text-xl'>Stock</Badge>
                            </CardHeaderChild>
                            <CardHeaderChild>
                                <AnimacionDeInputModoMovil
                                    globalFilter={globalFilter}
                                    setGlobalFilter={setGlobalFilter}
                                    anchoInput={180}
                                />
                            </CardHeaderChild>
                        </CardHeader>
                        <CardBody className='z-0'>
                            <div className='overflow-auto'>
                                <Table className='min-w-[600px] table-fixed'>
                                    <THead>
                                        {table.getHeaderGroups().map((headerGroup) => (
                                            <Tr key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <Th
                                                        key={header.id}
                                                        isColumnBorder={false}
                                                        className='text-left'>
                                                        {header.isPlaceholder ? null : (
                                                            <div
                                                                key={header.id}
                                                                aria-hidden='true'
                                                                {...{
                                                                    className:
                                                                        header.column.getCanSort()
                                                                            ? 'cursor-pointer select-none flex items-center'
                                                                            : '',
                                                                    onClick:
                                                                        header.column.getToggleSortingHandler(),
                                                                }}>
                                                                {flexRender(
                                                                    header.column.columnDef.header,
                                                                    header.getContext(),
                                                                )}
                                                                {{
                                                                    asc: (
                                                                        <Icon
                                                                            icon='HeroChevronUp'
                                                                            className='ltr:ml-1.5 rtl:mr-1.5'
                                                                        />
                                                                    ),
                                                                    desc: (
                                                                        <Icon
                                                                            icon='HeroChevronDown'
                                                                            className='ltr:ml-1.5 rtl:mr-1.5'
                                                                        />
                                                                    ),
                                                                }[
                                                                    header.column.getIsSorted() as string
                                                                ] ?? null}
                                                            </div>
                                                        )}
                                                    </Th>
                                                ))}
                                            </Tr>
                                        ))}
                                    </THead>
                                    <TBody>
                                        {table.getRowModel().rows.map((row) => (
                                            <Tr key={row.id}>
                                                {row.getVisibleCells().map((cell) => (
                                                    <Td key={cell.id}>
                                                        {flexRender(
                                                            cell.column.columnDef.cell,
                                                            cell.getContext(),
                                                        )}
                                                    </Td>
                                                ))}
                                            </Tr>
                                        ))}
                                    </TBody>
                                </Table>
                                <div className='mt-2 min-w-[600px]'>
                                    <TableCardFooterTemplateV2 table={table} />
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </Container>
            <GestionarSeriesEnStock
                isOpen={isOpenSeries}
                setIsOpen={setIsOpenSeries}
                stockItem={stockItemSeries}
            />
        </PageWrapper>
    );
}

export default DetalleBodega;
