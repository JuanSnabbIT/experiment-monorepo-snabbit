import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from '@/components/ui/Modal';
import Table, { TBody, Td, Th, THead, Tr } from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import SelectReact, { TSelectOption } from '@/components/form/SelectReact';
import ApiService from '@/services/ApiService';
import { confirmAlert } from '@/utils/sweetAlert';
import {
	eliminarUsuarioAsignadoSoporteThunk,
	listaEquiposPorClienteThunk,
	listaUsuariosAsignadosSoporteThunk,
	listaUsuariosDelEquipoPorClienteThunk,
	listaUsuariosTodoElClienteThunk,
	useAppDispatch,
	useAppSelector,
} from '@/store';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

interface ListaUsuarioEquipoOTProps {
	ordenId: number;
	soporteId: number;
	clienteId: number;
	isOpen: boolean;
	onClose: () => void;
	onSaved?: () => void;
}

type TipoFila = 'ue' | 'u';

interface FilaPendiente {
	tipo: TipoFila;
	id: string; // usuario_equipo id si tipo ue, o usuario_empresa id si tipo u
	usuarioEmpresaId?: string;
	usuarioEquipoId?: string;
	nombre: string;
	equipoLabel?: string;
	equipoId?: string;
}

function ListaUsuarioEquipoOT({
	ordenId,
	soporteId,
	clienteId,
	isOpen,
	onClose,
	onSaved,
}: ListaUsuarioEquipoOTProps) {
	const dispatch = useAppDispatch();
	const { listaUsuariosDelEquipoPorCliente, listaEquiposPorCliente } = useAppSelector(
		(state) => state.recursos,
	);
	const { listaUsuariosAsignadosSoporte } = useAppSelector((state) => state.ordenTrabajo);
	const { listaUsuariosTodoElCliente } = useAppSelector((state) => state.empresa);

	const [seleccionPendiente, setSeleccionPendiente] = useState<FilaPendiente[]>([]);
	const [selectValue, setSelectValue] = useState<TSelectOption | null>(null);
	const [guardando, setGuardando] = useState(false);

	useEffect(() => {
		if (!isOpen) return;
		dispatch(listaUsuariosDelEquipoPorClienteThunk({ cliente_id: clienteId }));
		dispatch(listaUsuariosAsignadosSoporteThunk({ id_orden: ordenId, id_soporte: soporteId }));
		dispatch(listaUsuariosTodoElClienteThunk({ id_empresa: clienteId }));
		dispatch(listaEquiposPorClienteThunk({ cliente_id: clienteId }));
	}, [clienteId, dispatch, isOpen, ordenId, soporteId]);

	useEffect(() => {
		if (!isOpen) {
			setSeleccionPendiente([]);
			setSelectValue(null);
			setGuardando(false);
		}
	}, [isOpen]);

	// Usuarios con equipo activo y usuarios sin equipo activo
	const opcionesUsuarios = useMemo(() => {
		const activos = (listaUsuariosDelEquipoPorCliente || [])
			.filter((u) => u.estado)
			.map((u) => ({
				value: `ue:${u.id}`,
				label: `${u.datos_equipo?.numero_serie || 'Equipo'} - ${u.nombre_usuario}`,
				usuarioEmpresaId: u.usuario.toString(),
				usuarioEquipoId: u.id.toString(),
				nombre: u.nombre_usuario,
				equipoLabel: u.datos_equipo?.numero_serie || 'Equipo',
				equipoId: u.equipo?.toString(),
			}));
		const activosUsuario = new Set(
			(listaUsuariosDelEquipoPorCliente || [])
				.filter((u) => u.estado)
				.map((u) => u.usuario.toString()),
		);
		const sinEquipo = (listaUsuariosTodoElCliente || [])
			.filter((u) => !activosUsuario.has(u.id.toString()))
			.map((u) => ({
				value: `u:${u.id}`,
				label: `${u.nombre_usuario} (sin equipo activo)`,
				usuarioEmpresaId: u.id.toString(),
				nombre: u.nombre_usuario,
			}));
		return [
			{ label: 'Usuarios con equipo', options: activos },
			{ label: 'Usuarios sin equipo', options: sinEquipo },
		];
	}, [listaUsuariosDelEquipoPorCliente, listaUsuariosTodoElCliente]);

	const yaAsignadosIds = useMemo(
		() => new Set((listaUsuariosAsignadosSoporte || []).map((u) => u.usuario_equipo.toString())),
		[listaUsuariosAsignadosSoporte],
	);

	const equiposActivosSet = useMemo(
		() =>
			new Set(
				(listaUsuariosDelEquipoPorCliente || [])
					.filter((u) => u.estado)
					.map((u) => u.equipo.toString()),
			),
		[listaUsuariosDelEquipoPorCliente],
	);

	const equiposActivosPorUsuario = useMemo(() => {
		const map = new Map<string, TSelectOption[]>();
		(listaUsuariosDelEquipoPorCliente || []).forEach((u) => {
			if (!u.estado) return; // solo equipos activos del usuario
			const key = u.usuario.toString();
			const arr = map.get(key) || [];
			arr.push({
				value: u.equipo.toString(),
				label: `${u.datos_equipo?.numero_serie || 'Equipo'}`,
			});
			map.set(key, arr);
		});
		return map;
	}, [listaUsuariosDelEquipoPorCliente]);

	const equiposInactivosEmpresa = useMemo(() => {
		const map = new Map<string, { value: string; label: string }>();
		const baseEquipos = listaEquiposPorCliente || [];

		baseEquipos.forEach((e) => {
			const id = e.id?.toString?.();
			if (!id || equiposActivosSet.has(id)) return;
			const label = `${e.numero_serie} - ${e.marca_label || e.marca}`;
			map.set(id, { value: id, label });
		});

		// Fallback: incluir equipos referenciados en usuarios-equipo inactivos
		(listaUsuariosDelEquipoPorCliente || [])
			.filter((u) => !u.estado)
			.forEach((u) => {
				const id = u.equipo?.toString?.();
				if (!id || equiposActivosSet.has(id) || map.has(id)) return;
				const labelBase = u.datos_equipo?.numero_serie || 'Equipo';
				const marca = u.datos_equipo?.marca_label || u.datos_equipo?.marca;
				const label = marca ? `${labelBase} - ${marca}` : labelBase;
				map.set(id, { value: id, label });
			});

		return Array.from(map.values());
	}, [listaEquiposPorCliente, listaUsuariosDelEquipoPorCliente, equiposActivosSet]);

	const handleSelect = (option: TSelectOption | null) => {
		if (!option) {
			setSelectValue(null);
			return;
		}
		const raw = (option.value as string) || '';
		if (raw.startsWith('ue:')) {
			const ueId = raw.replace('ue:', '');
			const flat = (opcionesUsuarios as any[]).flatMap((g) => g.options ?? []);
			const found: any = flat.find((o) => o.value === option.value);
			if (!found) {
				toast.error('Usuario con equipo no encontrado');
				return;
			}
			if (seleccionPendiente.some((u) => u.id === ueId) || yaAsignadosIds.has(ueId)) {
				toast.warning('Este usuario con equipo ya está agregado');
				setSelectValue(null);
				return;
			}
			setSeleccionPendiente((prev) => [
				...prev,
				{
					tipo: 'ue',
					id: ueId,
					usuarioEmpresaId: found.usuarioEmpresaId,
					usuarioEquipoId: found.usuarioEquipoId,
					nombre: found.nombre,
					equipoLabel: found.equipoLabel,
					equipoId: found.equipoId,
				},
			]);
			setSelectValue(null);
			return;
		}
		if (raw.startsWith('u:')) {
			const userId = raw.replace('u:', '');
			const flat = (opcionesUsuarios as any[]).flatMap((g) => g.options ?? []);
			const found: any = flat.find((o) => o.value === option.value);
			if (!found) return;
			setSeleccionPendiente((prev) => [
				...prev,
				{
					tipo: 'u',
					id: userId,
					usuarioEmpresaId: userId,
					nombre: found.nombre,
					equipoLabel: undefined,
					equipoId: undefined,
				},
			]);
			setSelectValue(null);
			return;
		}
	};

	const removerPendiente = (id: string) => {
		setSeleccionPendiente((prev) => prev.filter((u) => u.id !== id));
	};

	const eliminarAsignado = async (idAsignado: number, nombre: string) => {
		const ok = await confirmAlert({
			title: 'Confirmar eliminacion',
			text: `¿Eliminar la asignacion de ${nombre}?`,
			confirmText: 'Eliminar',
			cancelText: 'Cancelar',
			icon: 'warning',
			confirmColor: '#dc2626',
		});
		if (!ok) return;
		try {
			await dispatch(
				eliminarUsuarioAsignadoSoporteThunk({
					id_orden: ordenId,
					id_soporte: soporteId,
					id_usuario_asignado: idAsignado,
				}),
			);
			toast.success('Asignación eliminada', { autoClose: 1000 });
			dispatch(listaUsuariosAsignadosSoporteThunk({ id_orden: ordenId, id_soporte: soporteId }));
		} catch (error: any) {
			const msg = Object.values(error?.response?.data || {}).flat().join(' ');
			toast.error(msg || 'No se pudo eliminar la asignación');
		}
	};

	const guardarAsignaciones = async () => {
		if (seleccionPendiente.length === 0) {
			toast.warning('No hay usuarios para asignar');
			return;
		}
		// Validar que filas tipo 'u' tengan equipo seleccionado
		if (seleccionPendiente.some((f) => f.tipo === 'u' && !f.equipoId)) {
			toast.warning('Seleccione equipo para los usuarios sin equipo activo');
			return;
		}

		setGuardando(true);
		let exitosos = 0;
		let fallidos = 0;

		for (const usuario of seleccionPendiente) {
			try {
				let usuarioEquipoId = usuario.usuarioEquipoId;
				// Si es usuario sin UE, crear UE primero
				if (usuario.tipo === 'u') {
					const resp = await ApiService.fetchData<{ id: number }>({
						url: `/api/usuarios-equipo/`,
						method: 'post',
						headers: { 'Content-Type': 'application/json' },
						data: {
							usuario: usuario.usuarioEmpresaId,
							equipo: usuario.equipoId,
							estado: true,
						},
					});
					usuarioEquipoId = resp.data?.id?.toString();
				}

				try {
					await ApiService.fetchData({
						url: `/api/soportes-v2/${soporteId}/usuarios-asignados-soporte/`,
						method: 'post',
						headers: { 'Content-Type': 'application/json' },
						data: {
							usuario_equipo: usuarioEquipoId,
							soporte_tecnico: soporteId,
						},
					});
				} catch (error: any) {
					await ApiService.fetchData({
						url: `/api/ordenes-de-trabajo/${ordenId}/soportes-tecnicos/${soporteId}/usuarios-asignados/`,
						method: 'post',
						headers: { 'Content-Type': 'application/json' },
						data: {
							usuario_equipo: usuarioEquipoId,
							soporte_tecnico: soporteId,
						},
					});
				}
				exitosos++;
			} catch (error: any) {
				fallidos++;
				const msg = Object.values(error?.response?.data || {}).flat().join(' ');
				if (msg) toast.error(msg);
			}
		}

		setGuardando(false);
		setSeleccionPendiente([]);

		if (exitosos > 0) {
			toast.success(`${exitosos} usuario(s) asignado(s)`, { autoClose: 1200 });
			dispatch(listaUsuariosAsignadosSoporteThunk({ id_orden: ordenId, id_soporte: soporteId }));
			dispatch(listaUsuariosDelEquipoPorClienteThunk({ cliente_id: clienteId }));
			if (onSaved) onSaved();
			onClose();
		}
		if (fallidos > 0) {
			toast.error(`${fallidos} usuario(s) no pudieron asignarse`, { autoClose: 2000 });
		}
	};

	// Dropdown de equipos por fila pendiente
	const renderEquipoCell = (fila: FilaPendiente) => {
		if (fila.tipo === 'ue') {
			return fila.equipoLabel || 'Equipo';
		}
		const equiposUsuario = equiposActivosPorUsuario.get(fila.usuarioEmpresaId || '') || [];
		const opciones = [
			{ label: 'Equipos Activos del Usuario', options: equiposUsuario },
			{ label: 'Equipos Inactivos de la Empresa', options: equiposInactivosEmpresa },
		];
		return (
			<SelectReact
				name={`equipo-${fila.id}`}
				placeholder='Seleccione equipo'
				options={opciones}
				value={fila.equipoId ? { value: fila.equipoId, label: fila.equipoLabel || '' } : null}
				onChange={(opt) => {
					const val = (opt as TSelectOption | null)?.value as string | undefined;
					const lbl = (opt as TSelectOption | null)?.label as string | undefined;
					setSeleccionPendiente((prev) =>
						prev.map((p) =>
							p.id === fila.id
								? {
										...p,
										equipoId: val,
										equipoLabel: lbl,
									}
								: p,
						),
					);
				}}
			/>
		);
	};

	return (
		<>
			<Modal isOpen={isOpen} setIsOpen={onClose} isStaticBackdrop={true} size='xl'>
				<ModalHeader>
					<Badge className='text-xl'>Usuarios con Equipo del Cliente</Badge>
				</ModalHeader>
				<ModalBody>
					<div className='flex flex-col gap-4'>
						<div>
							<Badge>Usuarios de la Empresa</Badge>
							<SelectReact
								name='usuario_equipo'
								placeholder='Seleccione un usuario'
								isClearable
								options={opcionesUsuarios as any}
								value={selectValue}
								noOptionsMessage={() => 'Crear nueva asignación'}
								formatCreateLabel={() => 'Crear nueva asignación'}
								onCreateOption={() => {
									// No crear desde aquí; se maneja con selección u:
									toast.info('Seleccione un usuario sin equipo para crear uno nuevo');
								}}
								onChange={(val) => handleSelect(val as TSelectOption | null)}
							/>
							<div className='mt-2 text-xs text-gray-500'>
								Usuarios asignados no aparecerán en la selección.
							</div>
						</div>

						<div className='rounded-lg border'>
							<div className='flex items-center justify-between border-b px-4 py-2'>
								<Badge>
									Asignados: {listaUsuariosAsignadosSoporte?.length ?? 0} | Pendientes:{' '}
									{seleccionPendiente.length}
								</Badge>
							</div>
							<Table>
								<THead>
									<Tr>
										<Th className='text-left'>Usuario</Th>
										<Th className='text-left'>Equipo</Th>
										<Th className='text-left'>Asignación</Th>
										<Th className='text-center'>Acciones</Th>
									</Tr>
								</THead>
								<TBody>
									{(listaUsuariosAsignadosSoporte || []).map((u) => (
										<Tr key={`asignado-${u.id}`}>
											<Td>{u.nombre_usuario}</Td>
											<Td>{u.numero_serie_equipo}</Td>
											<Td>
												<Badge color={u.resuelto ? 'emerald' : 'blue'}>Asignado</Badge>
											</Td>
											<Td className='text-center'>
												<Tooltip text='Eliminar asignación'>
													<Button
														variant='solid'
														color='red'
														size='xs'
														icon='HeroTrash'
														onClick={() => eliminarAsignado(u.id, u.nombre_usuario)}
													/>
												</Tooltip>
											</Td>
										</Tr>
									))}
									{seleccionPendiente.map((u) => (
										<Tr key={`pendiente-${u.id}`}>
											<Td>{u.nombre}</Td>
											<Td>{renderEquipoCell(u)}</Td>
											<Td>
												<Badge color='amber'>Pendiente de guardar</Badge>
											</Td>
											<Td className='text-center'>
												<Button
													variant='solid'
													color='red'
													size='xs'
													icon='HeroTrash'
													onClick={() => removerPendiente(u.id)}
												/>
											</Td>
										</Tr>
									))}
									{(listaUsuariosAsignadosSoporte?.length ?? 0) === 0 &&
										seleccionPendiente.length === 0 && (
											<Tr>
												<Td colSpan={4} className='text-center text-gray-500'>
													No hay usuarios con equipo asignados.
												</Td>
											</Tr>
										)}
								</TBody>
							</Table>
						</div>
					</div>
				</ModalBody>
				<ModalFooter>
					<ModalFooterChild />
					<ModalFooterChild>
						<Button
							color='red'
							onClick={() => {
								onClose();
							}}
							isDisable={guardando}>
							Cancelar
						</Button>
						<Button
							variant='solid'
							onClick={guardarAsignaciones}
							isDisable={guardando || seleccionPendiente.length === 0}>
							{guardando
								? 'Guardando...'
								: `Guardar${seleccionPendiente.length ? ` (${seleccionPendiente.length})` : ''}`}
						</Button>
					</ModalFooterChild>
				</ModalFooter>
			</Modal>
		</>
	);
}

export default ListaUsuarioEquipoOT;
