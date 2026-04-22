import Checkbox from '@/components/form/Checkbox';
import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Validation from '@/components/form/Validation';
import Icon from '@/components/icon/Icon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, {
    ModalBody,
    ModalFooter,
    ModalFooterChild,
    ModalHeader,
} from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import { IUsuarioEmpresa } from '@/interface/empresas.interface';
import ApiService from '@/services/ApiService';
import {
    detalleBodegaThunk,
    listaMisClientesThunk,
    listaUsuariosTodaLaEmpresaThunk,
    useAppDispatch,
    useAppSelector,
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
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import * as Yup from 'yup';

const columnHelper = createColumnHelper<IUsuarioEmpresa>();

function CrearGuiaSalidaEnDetalleBodega({
    isOpen,
    setIsOpen,
    id_bodega,
}: {
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    id_bodega: number | undefined;
}) {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { listaUsuariosTodaLaEmpresa, detalleUsuarioEmpresa, listaMisClientes } = useAppSelector(
        (state) => state.empresa,
    );
    const [optUsuarios, setOptUsuarios] = useState<IUsuarioEmpresa[]>([]);
    const [userSelect, setUserSelect] = useState<IUsuarioEmpresa | undefined>();
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        setOptUsuarios(listaUsuariosTodaLaEmpresa);
    }, [listaUsuariosTodaLaEmpresa]);

    useEffect(() => {
        if (isOpen && personalizacionUsuario && personalizacionUsuario.empresa) {
            dispatch(listaMisClientesThunk({ id_empresa: personalizacionUsuario.empresa }));
            dispatch(
                listaUsuariosTodaLaEmpresaThunk({ id_empresa: personalizacionUsuario.empresa }),
            );
        }
    }, [isOpen, personalizacionUsuario]);

    const columns = [
        columnHelper.accessor('nombre_usuario', {
            cell: (info) => info.getValue(),
            header: 'Nombre',
        }),
        columnHelper.accessor('email_usuario', {
            cell: (info) => info.getValue(),
            header: 'Correo',
        }),
        columnHelper.display({
            id: 'acciones',
            cell: (info) => (
                <div className='flex justify-end'>
                    <Checkbox
                        onChange={(e) => {
                            if (e.target.checked) {
                                setUserSelect(info.row.original);
                            } else {
                                setUserSelect(undefined);
                            }
                        }}
                        checked={userSelect?.id === info.row.original.id}
                        disabled={userSelect && userSelect.id !== info.row.original.id}
                    />
                </div>
            ),
            header: '',
        }),
    ];

    const table = useReactTable({
        data: optUsuarios,
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

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            cliente: '',
            motivo: '',
        },
        validationSchema: Yup.object().shape({
            cliente: Yup.string().required('Requerido').nonNullable('Requerido'),
            motivo: Yup.string().nonNullable('No puede ser nulo').notRequired(),
        }),
        onSubmit: async (values) => {
            if (userSelect) {
                try {
                    const response = await ApiService.fetchData<{ id: number }>({
                        url: `/api/guia-salida/`,
                        method: 'post',
                        headers: { 'Content-Type': 'application/json' },
                        data: {
                            ...values,
                            bodega: id_bodega,
                            sucursal: personalizacionUsuario?.sucursal_principal,
                            recibido_por: userSelect.id,
                            creado_por: detalleUsuarioEmpresa?.id,
                        },
                    });
                    if (response.data) {
                        const guiaId = response.data.id;
                        dispatch(detalleBodegaThunk({ id_bodega }));
                        formik.resetForm();
                        setIsOpen(false);
                        const isDark =
                            typeof document !== 'undefined' &&
                            document.documentElement.classList.contains('dark');
                        const result = await Swal.fire({
                            title: '¡Guía creada!',
                            text: 'Guía de salida creada correctamente.',
                            icon: 'success',
                            showCancelButton: true,
                            confirmButtonText: 'Ir al Detalle de Guía',
                            cancelButtonText: 'Quedarme aquí',
                            reverseButtons: true,
                            background: isDark ? '#18181b' : undefined,
                            color: isDark ? '#e4e4e7' : undefined,
                            confirmButtonColor: isDark ? '#6366f1' : '#22c55e',
                            cancelButtonColor: isDark ? '#52525b' : undefined,
                        });
                        if (result.isConfirmed) {
                            navigate(`/bodega/detalle-guia-salida-bodega/${guiaId}`);
                        }
                    }
                } catch (error: any) {
                    toast.error(error.response.data);
                }
            } else {
                toast.error('Eliga a un usuario para entregarle los items');
            }
        },
    });

    return (
        <>
            <Button
                variant='solid'
                onClick={() => {
                    setIsOpen(true);
                }}>
                Crear Guia de Salida para esta Bodega
            </Button>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className='text-xl'>Crear Guia de Salida</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className='flex flex-col gap-4'>
                        <div className='w-full'>
                            <Badge>Cliente</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.cliente}
                                invalidFeedback={formik.errors.cliente}>
                                <SelectReact
                                    name='cliente'
                                    options={listaMisClientes.map((cliente) => ({
                                        value: cliente.info_cliente.id.toString(),
                                        label: cliente.info_cliente.nombre,
                                    }))}
                                    placeholder='Seleccione un Cliente'
                                    value={listaMisClientes
                                        .map((cliente) => ({
                                            value: cliente.info_cliente.id.toString(),
                                            label: cliente.info_cliente.nombre,
                                        }))
                                        .find((option) => option.value === formik.values.cliente)}
                                    noOptionsMessage={(e) => `No existe ${e.inputValue}`}
                                    onBlur={formik.handleBlur}
                                    onChange={(e) => {
                                        formik.setFieldValue('cliente', (e as TSelectOption).value);
                                    }}
                                />
                            </Validation>
                        </div>
                        <div className='w-full'>
                            <Badge>Motivo</Badge>
                            <Textarea
                                name='motivo'
                                onBlur={formik.handleBlur}
                                value={formik.values.motivo}
                                onChange={formik.handleChange}
                            />
                        </div>
                        <div className='w-full'>
                            <div className='mb-2 flex items-center justify-between gap-4'>
                                <Badge>Responsable</Badge>
                                <Input
                                    className='max-w-[200px]'
                                    name='globalFilter'
                                    placeholder='Buscar...'
                                    value={globalFilter}
                                    onChange={(e) => {
                                        setGlobalFilter(e.target.value);
                                    }}
                                />
                            </div>
                            <div className='overflow-auto'>
                                <Table className='min-w-[400px] table-fixed'>
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
                                <div className='mt-2 min-w-[400px]'>
                                    <TableCardFooterTemplateV2 table={table} />
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button
                            color='red'
                            onClick={() => {
                                setIsOpen(false);
                                formik.resetForm();
                            }}>
                            Cancelar
                        </Button>
                        <Button
                            variant='solid'
                            onClick={() => {
                                formik.handleSubmit();
                            }}>
                            Crear
                        </Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    );
}

export default CrearGuiaSalidaEnDetalleBodega;
