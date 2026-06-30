import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Textarea from '@/components/form/Textarea';
import Icon from '@/components/icon/Icon';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import AnimacionDeInputModoMovil from '@/components/utils/AnimacionDeIntputModoMovil';
import themeConfig from '@/config/theme.config';
import { IUsuarioEmpresa } from '@/interface/empresas.interface';
import {
    listaDiasCalendarioThunk,
    listaSolicitudesVacacionesUsuarioThunk,
    useAppDispatch,
    useAppSelector,
} from '@/store';
import {
    useGetDetalleUsuarioClienteQuery,
    useGetMisClientesQuery,
    useGetUsuariosTodaLaEmpresaQuery,
} from '@/store/slices/empresa/empresaApi';
import { useCrearSolicitudVacacionesMutation } from '@/store/slices/vacaciones/vacacionesApi';
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
import es from 'date-fns/locale/es';
import dayjs from 'dayjs';
import { useFormik } from 'formik';
import { useEffect, useState } from 'react';
import { DateRange, Range, RangeKeyDict } from 'react-date-range';
import { toast } from 'react-toastify';
import colors from 'tailwindcss/colors';
import * as Yup from 'yup';
import calcularDiasHabilesConCalendario from './utils/calcularDiasHabilesConCalendario';

const columHelper = createColumnHelper<IUsuarioEmpresa>();

function PedirVacaciones() {
    const dispatch = useAppDispatch();
    const { personalizacionUsuario, userMe } = useAppSelector((state) => state.auth);
    const [crearSolicitud] = useCrearSolicitudVacacionesMutation();
    const { listaDiasCalendario, listaSolicitudesVacacionesUsuario } = useAppSelector(
        (state) => state.calendario,
    );

    const empresaPropia = personalizacionUsuario?.empresa ?? undefined;

    const [empresaSeleccionadaId, setEmpresaSeleccionadaId] = useState<number | undefined>(
        empresaPropia,
    );
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<IUsuarioEmpresa>();
    const [usuarioSeleccionadoId, setUsuarioSeleccionadoId] = useState<number | undefined>();
    const [state, setState] = useState<Range[]>([
        {
            startDate: dayjs().toDate(),
            endDate: dayjs().toDate(),
            color: '#389d36',
            disabled: false,
            key: 'selection',
        },
    ]);

    const { data: misClientes = [] } = useGetMisClientesQuery(empresaPropia, {
        skip: !empresaPropia,
    });

    const { data: usuariosEmpresaActual = [] } = useGetUsuariosTodaLaEmpresaQuery(
        empresaSeleccionadaId ?? 0,
        { skip: !empresaSeleccionadaId },
    );

    const { data: detalleUsuario } = useGetDetalleUsuarioClienteQuery(
        usuarioSeleccionadoId ?? 0,
        { skip: !usuarioSeleccionadoId },
    );

    const opcionesEmpresa: TSelectOption[] = [
        { value: String(empresaPropia ?? ''), label: 'Mi Empresa' },
        ...misClientes.map((rel) => ({
            value: String(rel.cliente),
            label: rel.info_cliente.nombre,
        })),
    ].filter((opt) => opt.value !== '');

    useEffect(() => {
        if (empresaPropia && !empresaSeleccionadaId) {
            setEmpresaSeleccionadaId(empresaPropia);
        }
    }, [empresaPropia]);

    useEffect(() => {
        if (state.length > 0) {
            if (state[0].startDate) {
                formik.setFieldValue('fecha_inicio', state[0].startDate.toDateString());
            }
            if (state[0].endDate) {
                formik.setFieldValue('fecha_fin', state[0].endDate.toDateString());
            }
        }
    }, [state]);

    useEffect(() => {
        if (personalizacionUsuario) {
            dispatch(listaDiasCalendarioThunk());
        }
    }, [personalizacionUsuario]);

    useEffect(() => {
        if (usuarioSeleccionado) {
            const filtro = new URLSearchParams();
            filtro.append('usuario_empresa', usuarioSeleccionado.id.toString());
            dispatch(listaSolicitudesVacacionesUsuarioThunk({ filtro }));
        }
    }, [usuarioSeleccionado]);

    useEffect(() => {
        setState((prev) => {
            const selectionRange = prev.find((r) => r.key === 'selection') ?? {
                startDate: dayjs().toDate(),
                endDate: dayjs().toDate(),
                color: colors.blue[themeConfig.themeColorShade],
                disabled: false,
                key: 'selection',
            };

            const ranges: Range[] = [selectionRange];

            if (usuarioSeleccionado) {
                ranges.push(
                    ...listaSolicitudesVacacionesUsuario
                        .filter((sol) => sol.estado === '2')
                        .map((sol, index) => ({
                            startDate: dayjs(sol.fecha_inicio).toDate(),
                            endDate: dayjs(sol.fecha_fin).toDate(),
                            color: colors.emerald[themeConfig.themeColorShade],
                            disabled: true,
                            key: `tomada_${index}`,
                        })),
                );
            }

            ranges.push(
                ...listaDiasCalendario
                    .filter((dias) => dias.es_feriado)
                    .map((dias, index) => ({
                        startDate: dayjs(dias.fecha).toDate(),
                        endDate: dayjs(dias.fecha).toDate(),
                        color: colors.red[themeConfig.themeColorShade],
                        disabled: true,
                        key: `feriado_${index}`,
                    })),
            );

            return ranges;
        });
    }, [listaDiasCalendario, listaSolicitudesVacacionesUsuario, usuarioSeleccionado]);

    const validationSchema = Yup.object()
        .shape({
            usuario_empresa: Yup.number().required('Selecciona un empleado').min(1, 'Selecciona un empleado'),
            fecha_inicio: Yup.string().required('Requerido'),
            fecha_fin: Yup.string().required('Requerido'),
            comentario: Yup.string().nullable(),
        })
        .test('dias-disponibles', 'No tienes suficientes días disponibles', function (values) {
            const { usuario_empresa, fecha_inicio, fecha_fin } = values;

            if (usuario_empresa > 0 && fecha_inicio && fecha_fin && detalleUsuario) {
                const diasHabiles = calcularDiasHabilesConCalendario(
                    new Date(fecha_inicio),
                    new Date(fecha_fin),
                    listaDiasCalendario,
                );
                const disponibles = detalleUsuario.papeleta.dias_disponibles;
                if (disponibles < diasHabiles) {
                    return this.createError({
                        path: 'fecha_fin',
                        message: `Los días seleccionados (${diasHabiles}) exceden los días disponibles (${disponibles}).`,
                    });
                }
            }

            return true;
        });

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            usuario_empresa: 0,
            fecha_inicio: '',
            fecha_fin: '',
            comentario: '',
        },
        validationSchema,
        onSubmit: async (values) => {
            try {
                await crearSolicitud({
                    usuario_empresa: values.usuario_empresa,
                    fecha_inicio: dayjs(values.fecha_inicio).format('YYYY-MM-DD'),
                    fecha_fin: dayjs(values.fecha_fin).format('YYYY-MM-DD'),
                    es_extraordinaria: false,
                    comentario: values.comentario,
                    creado_por: userMe?.pk,
                }).unwrap();
                toast.success('Solicitud Creada', { autoClose: 1000 });
                formik.resetForm();
                setUsuarioSeleccionado(undefined);
                setUsuarioSeleccionadoId(undefined);
                setState([
                    {
                        startDate: new Date(),
                        endDate: new Date(),
                        color: '#389d36',
                        disabled: false,
                        key: 'selection',
                    },
                ]);
            } catch (err: any) {
                const msg =
                    err?.data?.non_field_errors?.[0] ??
                    err?.data?.detail ??
                    'Error al crear la solicitud';
                toast.error(msg);
            }
        },
    });

    const columns = [
        columHelper.accessor('nombre_usuario', {
            cell: (info) => info.getValue(),
            header: 'Nombre',
        }),
        columHelper.accessor('papeleta.dias_disponibles', {
            cell: (info) => {
                const dias = info.getValue();
                const color = dias <= 0 ? 'text-red-500' : dias <= 5 ? 'text-amber-500' : 'text-emerald-600';
                return <span className={`font-semibold ${color}`}>{dias} días</span>;
            },
            header: 'Días disp.',
        }),
    ];

    const table = useReactTable({
        data: usuariosEmpresaActual,
        columns: columns,
        state: {
            sorting: sorting,
            globalFilter: globalFilter,
        },
        onSortingChange: setSorting,
        enableGlobalFilter: true,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <PageWrapper
            isProtectedRoute={true}
            title='Crear Solicitud Vacaciones'
            name='Crear Solicitud Vacaciones'>
            <Subheader>
                <SubheaderLeft>{null}</SubheaderLeft>
                <SubheaderRight>
                    <Button
                        onClick={async () => {
                            const errors = await formik.validateForm();
                            const msgs = Object.values(errors).filter(
                                (v): v is string => typeof v === 'string',
                            );
                            if (msgs.length > 0) {
                                msgs.forEach((msg) => toast.error(msg));
                                return;
                            }
                            formik.handleSubmit();
                        }}
                        variant='solid'>
                        Crear Solicitud
                    </Button>
                </SubheaderRight>
            </Subheader>
            <Container className='h-full w-full'>
                <div className='grid grid-cols-12 gap-4'>
                    <div className='col-span-full'>
                        <Card>
                            <CardBody className='flex flex-col items-center justify-center md:flex-row'>
                                <div className='w-full'>
                                    <Badge>Dias Acumulados</Badge>
                                    <div id='dias_acumulados' className='ml-4'>
                                        {detalleUsuario
                                            ? `${detalleUsuario.papeleta.dias_acumulados} dias`
                                            : <span className='text-sm italic text-zinc-400'>Selecciona un empleado</span>}
                                    </div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Dias Disponibles</Badge>
                                    <div id='dias_disponibles' className='ml-4'>
                                        {detalleUsuario
                                            ? `${detalleUsuario.papeleta.dias_disponibles} dias`
                                            : <span className='text-sm italic text-zinc-400'>Selecciona un empleado</span>}
                                    </div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Dias Tomados</Badge>
                                    <div id='dias_tomados' className='ml-4'>
                                        {detalleUsuario
                                            ? `${detalleUsuario.papeleta.dias_tomados} dias`
                                            : <span className='text-sm italic text-zinc-400'>Selecciona un empleado</span>}
                                    </div>
                                </div>
                                <div className='w-full'>
                                    <Badge>Dias Habiles Seleccionados</Badge>
                                    <div className='ml-4'>
                                        {formik.values.fecha_inicio && formik.values.fecha_fin && detalleUsuario ? (() => {
                                            const habiles = calcularDiasHabilesConCalendario(
                                                new Date(formik.values.fecha_inicio),
                                                new Date(formik.values.fecha_fin),
                                                listaDiasCalendario,
                                            );
                                            const excede = habiles > detalleUsuario.papeleta.dias_disponibles;
                                            return (
                                                <span className={excede ? 'font-bold text-red-500' : ''}>
                                                    {habiles} {excede ? '⚠ Excede disponibles' : ''}
                                                </span>
                                            );
                                        })() : <span className='text-sm italic text-zinc-400'>Selecciona empleado y fechas</span>}
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                    <div className='order-1 col-span-12 lg:col-span-6'>
                        <Card className='h-full'>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge color='blue' className='mr-2'>1</Badge>
                                    <Badge className='text-lg'>Empresa</Badge>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <SelectReact
                                    name='empresa'
                                    options={opcionesEmpresa}
                                    value={
                                        opcionesEmpresa.find(
                                            (o) => o.value === String(empresaSeleccionadaId ?? ''),
                                        ) ?? null
                                    }
                                    onChange={(opt) => {
                                        const id = Number((opt as TSelectOption)?.value);
                                        setEmpresaSeleccionadaId(id || undefined);
                                        formik.setFieldValue('usuario_empresa', 0);
                                        setUsuarioSeleccionado(undefined);
                                        setUsuarioSeleccionadoId(undefined);
                                    }}
                                    placeholder='Seleccionar empresa...'
                                />
                            </CardBody>
                        </Card>
                    </div>
                    <div className='order-2 col-span-12 lg:col-span-6' />
                    <div className='order-3 col-span-12 lg:col-span-6'>
                        <Card className='h-full'>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge color='blue' className='mr-2'>2</Badge>
                                    <Badge className='text-lg'>Empleado</Badge>
                                </CardHeaderChild>
                                <CardHeaderChild>
                                    <AnimacionDeInputModoMovil
                                        globalFilter={globalFilter}
                                        setGlobalFilter={setGlobalFilter}
                                        anchoInput={200}
                                    />
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody className='z-0 max-h-[50vh] overflow-y-auto'>
                                <div>
                                    <Table className='table-fixed'>
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
                                                                        header.column.columnDef
                                                                            .header,
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
                                                <Tr
                                                    className={`hover:cursor-pointer ${formik.values.usuario_empresa === row.original.id ? 'bg-blue-500 text-white' : ''}`}
                                                    key={row.id}
                                                    onClick={() => {
                                                        if (
                                                            formik.values.usuario_empresa ===
                                                            row.original.id
                                                        ) {
                                                            formik.setFieldValue('usuario_empresa', 0);
                                                            setUsuarioSeleccionado(undefined);
                                                            setUsuarioSeleccionadoId(undefined);
                                                        } else {
                                                            formik.setFieldValue(
                                                                'usuario_empresa',
                                                                row.original.id,
                                                            );
                                                            setUsuarioSeleccionado(row.original);
                                                            setUsuarioSeleccionadoId(row.original.id);
                                                        }
                                                    }}>
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
                                    <div className='mt-2'>
                                        <TableCardFooterTemplateV2 table={table} />
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                    <div className='order-4 col-span-12 lg:col-span-6'>
                        <Card className='h-full'>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge color='blue' className='mr-2'>3</Badge>
                                    <Badge className='text-lg'>Fechas</Badge>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody className='flex flex-col'>
                                <div className='flex justify-center'>
                                    <DateRange
                                        showPreview={true}
                                        locale={es}
                                        ranges={state}
                                        showDateDisplay={false}
                                        maxDate={dayjs().add(1, 'year').toDate()}
                                        onChange={(item: RangeKeyDict) => {
                                            const sel = item.selection;
                                            setState((prev) =>
                                                prev.map((range) =>
                                                    range.key === sel.key
                                                        ? {
                                                              ...range,
                                                              startDate: sel.startDate,
                                                              endDate: sel.endDate,
                                                          }
                                                        : range,
                                                ),
                                            );
                                        }}
                                    />
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                    <div className='order-5 col-span-12'>
                        <Card>
                            <CardHeader>
                                <CardHeaderChild>
                                    <Badge color='blue' className='mr-2'>4</Badge>
                                    <Badge className='text-lg'>Comentario</Badge>
                                    <span className='ml-2 text-xs text-zinc-400'>(opcional)</span>
                                </CardHeaderChild>
                            </CardHeader>
                            <CardBody>
                                <Textarea
                                    rows={4}
                                    name='comentario'
                                    value={formik.values.comentario}
                                    onChange={formik.handleChange}
                                />
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </Container>
        </PageWrapper>
    );
}

export default PedirVacaciones;
