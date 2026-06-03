import Input from '@/components/form/Input';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import { Pages } from '@/config/pages.config';
import { IContratoTrabajador, TEstadoContrato } from '@/interface/rrhh.interface';
import { useAppDispatch, useAppSelector } from '@/store';
import { listaMisClientesThunk } from '@/store/slices/empresa/empresaSlice';
import {
    useGetContratosTrabajadorPorEmpresaClienteQuery,
    useGetContratosTrabajadorQuery,
} from '@/store/slices/rrhh/contratoTrabajadorApi';
import { formatRut } from '@/utils/rut.util';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Colores de estado ──────────────────────────────────────────────────────────
const BADGE_COLOR: Record<string, 'amber' | 'emerald' | 'red' | 'zinc'> = {
    vigente: 'emerald',
    pendiente_aprobacion: 'amber',
    borrador: 'zinc',
    terminado: 'zinc',
    anulado: 'red',
    descartado: 'zinc',
};

// Prioridad para elegir el contrato representativo por trabajador
const PRIORIDAD_ESTADO: Record<string, number> = {
    vigente: 0,
    pendiente_aprobacion: 1,
    borrador: 2,
    terminado: 3,
    descartado: 4,
    anulado: 5,
};

interface IFilaTrabajador {
    ueId: number;
    nombre: string;
    rut: string | null;
    cargo: string;
    tipoContratoLabel: string | null;
    estado: TEstadoContrato;
    estadoLabel: string;
}

function derivarFilas(contratos: IContratoTrabajador[]): IFilaTrabajador[] {
    const porTrabajador = new Map<number, IContratoTrabajador[]>();

    for (const c of contratos) {
        if (!c.usuario_empresa) continue;
        const lista = porTrabajador.get(c.usuario_empresa) ?? [];
        lista.push(c);
        porTrabajador.set(c.usuario_empresa, lista);
    }

    const filas: IFilaTrabajador[] = [];
    porTrabajador.forEach((lista, ueId) => {
        const mejor = lista.reduce((a, b) => {
            const pa = PRIORIDAD_ESTADO[a.estado] ?? 99;
            const pb = PRIORIDAD_ESTADO[b.estado] ?? 99;
            return pa <= pb ? a : b;
        });
        filas.push({
            ueId,
            nombre: mejor.nombre_trabajador ?? `Trabajador #${ueId}`,
            rut: mejor.rut_trabajador ?? null,
            cargo: mejor.cargo,
            tipoContratoLabel: mejor.tipo_contrato_label ?? null,
            estado: mejor.estado,
            estadoLabel: mejor.estado_label ?? mejor.estado,
        });
    });

    return filas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

// ── Componente ─────────────────────────────────────────────────────────────────
const ListaTrabajadores = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { listaMisClientes } = useAppSelector((state) => state.empresa);

    const [filtroEmpresa, setFiltroEmpresa] = useState<TSelectOption | null>(null);
    const [busqueda, setBusqueda] = useState('');

    // Cargar lista de empresas cliente al montar
    useEffect(() => {
        if (personalizacionUsuario?.empresa && listaMisClientes.length === 0) {
            dispatch(listaMisClientesThunk({ id_empresa: personalizacionUsuario.empresa }));
        }
    }, [personalizacionUsuario?.empresa, listaMisClientes.length, dispatch]);

    const empresasOpts: TSelectOption[] = listaMisClientes.map((r) => ({
        value: String(r.info_cliente.id),
        label: r.info_cliente.nombre,
    }));

    // Cuando hay empresa seleccionada usa el endpoint filtrado; si no, trae todos
    const { data: todosSinFiltro = [], isLoading: loadingTodos, isError: errorTodos } =
        useGetContratosTrabajadorQuery(undefined, {
            skip: !!filtroEmpresa || !personalizacionUsuario?.empresa,
        });

    const { data: contratosPorEmpresa = [], isLoading: loadingFiltrado, isError: errorFiltrado } =
        useGetContratosTrabajadorPorEmpresaClienteQuery(filtroEmpresa?.value ?? '', {
            skip: !filtroEmpresa,
        });

    const contratos = filtroEmpresa ? contratosPorEmpresa : todosSinFiltro;
    const isLoading = filtroEmpresa ? loadingFiltrado : loadingTodos;
    const isError = filtroEmpresa ? errorFiltrado : errorTodos;

    const filas = useMemo(() => derivarFilas(contratos), [contratos]);

    const filasFiltradas = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        if (!q) return filas;
        return filas.filter(
            (f) =>
                f.nombre.toLowerCase().includes(q) ||
                (f.rut &&
                    f.rut
                        .toLowerCase()
                        .replace(/\./g, '')
                        .replace(/-/g, '')
                        .includes(q.replace(/\./g, '').replace(/-/g, ''))),
        );
    }, [filas, busqueda]);

    const irAlDetalle = (ueId: number) => {
        navigate(Pages.rrhh.subPages.detalleTrabajador.to.replace(':ueId', String(ueId)));
    };

    return (
        <PageWrapper>
            <Subheader>
                <SubheaderLeft>
                    <SelectReact
                        name='filtro_empresa'
                        options={empresasOpts}
                        value={filtroEmpresa}
                        onChange={(opt) => {
                            setFiltroEmpresa(opt as TSelectOption | null);
                            setBusqueda('');
                        }}
                        placeholder='Todas las empresas'
                        isClearable
                        className='w-52'
                    />
                </SubheaderLeft>
                <SubheaderRight>
                    <Input
                        name='busqueda'
                        placeholder='Buscar por nombre o RUT...'
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className='w-52'
                    />
                </SubheaderRight>
            </Subheader>
            <Container>
                <Card>
                    <CardHeader>
                        <CardHeaderChild>
                            <span className='text-sm text-zinc-500 dark:text-zinc-400'>
                                {isLoading
                                    ? 'Cargando...'
                                    : `${filasFiltradas.length} trabajador${filasFiltradas.length !== 1 ? 'es' : ''}`}
                            </span>
                        </CardHeaderChild>
                    </CardHeader>
                    <CardBody>
                        {isError && (
                            <Alert color='red'>Error al cargar los trabajadores.</Alert>
                        )}
                        {!isLoading && !isError && filasFiltradas.length === 0 && (
                            <Alert color='zinc'>
                                {busqueda
                                    ? 'Sin resultados para la búsqueda.'
                                    : 'No hay trabajadores registrados.'}
                            </Alert>
                        )}
                        {(isLoading || filasFiltradas.length > 0) && (
                            <Table>
                                <THead>
                                    <Tr>
                                        <Th>Trabajador</Th>
                                        <Th>RUT</Th>
                                        <Th>Cargo</Th>
                                        <Th>Contrato vigente</Th>
                                        <Th>Estado</Th>
                                    </Tr>
                                </THead>
                                <TBody>
                                    {isLoading
                                        ? Array.from({ length: 5 }).map((_, i) => (
                                              <Tr key={i}>
                                                  {Array.from({ length: 5 }).map((__, j) => (
                                                      <Td key={j}>
                                                          <div className='h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700' />
                                                      </Td>
                                                  ))}
                                              </Tr>
                                          ))
                                        : filasFiltradas.map((f) => (
                                              <Tr
                                                  key={f.ueId}
                                                  className='cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                                                  onClick={() => irAlDetalle(f.ueId)}>
                                                  <Td className='font-medium'>{f.nombre}</Td>
                                                  <Td className='text-zinc-500 dark:text-zinc-400'>
                                                      {f.rut ? formatRut(f.rut) : '—'}
                                                  </Td>
                                                  <Td>{f.cargo || '—'}</Td>
                                                  <Td>{f.tipoContratoLabel ?? '—'}</Td>
                                                  <Td>
                                                      <Badge
                                                          variant='solid'
                                                          color={BADGE_COLOR[f.estado] ?? 'zinc'}>
                                                          {f.estadoLabel}
                                                      </Badge>
                                                  </Td>
                                              </Tr>
                                          ))}
                                </TBody>
                            </Table>
                        )}
                    </CardBody>
                </Card>
            </Container>
        </PageWrapper>
    );
};

export default ListaTrabajadores;
