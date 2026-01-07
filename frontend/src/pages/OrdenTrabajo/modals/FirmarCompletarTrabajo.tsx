import SelectReact, { TSelectOption } from "@/components/form/SelectReact";
import Validation from "@/components/form/Validation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal";
import ApiService from "@/services/ApiService";
import { listaUsuariosTodoElClienteThunk, useAppDispatch, useAppSelector } from "@/store";
import { useFormik } from "formik";
import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { toast } from "react-toastify";
import * as Yup from "yup";

interface Props {
	ordenId: number;
	trabajoId: number;
	trabajoTipo: "servicio" | "soporte";
	estadoFinal: "completado" | "medianamente_completado";
	clienteId: number;
	tecnicoNombre: string;
	comentariosTecnicos: Array<{ comentario: string; fecha_creacion: string }>;
	isOpen: boolean;
	setIsOpen: Dispatch<SetStateAction<boolean>>;
	onSuccess?: () => void;
}

function FirmarCompletarTrabajo({
	ordenId,
	trabajoId,
	trabajoTipo,
	estadoFinal,
	clienteId,
	tecnicoNombre,
	comentariosTecnicos,
	isOpen,
	setIsOpen,
	onSuccess,
}: Props) {
	const dispatch = useAppDispatch();
	const { listaUsuariosTodoElCliente } = useAppSelector((state) => state.empresa);
	const sigCanvas = useRef<SignatureCanvas | null>(null);
	const topRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (isOpen && clienteId) {
			dispatch(listaUsuariosTodoElClienteThunk({ id_empresa: clienteId }));
		}
	}, [isOpen, clienteId, dispatch]);

	// Ensure modal is visible and centered when opened
	useEffect(() => {
		if (isOpen) {
			// Scroll into view
			if (topRef.current) {
				topRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
			}
			// Lock background scroll
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	const clear = () => {
		if (sigCanvas.current) {
			sigCanvas.current.clear();
		}
	};

	const usuariosOptions: TSelectOption[] = (listaUsuariosTodoElCliente || []).map((u: any) => ({
		value: u.id.toString(),
		label: u.usuario_nombre || u.nombre_usuario || `Usuario ${u.id}`,
	}));

	const formik = useFormik({
		enableReinitialize: true,
		initialValues: {
			entregado_a: "",
		},
		validationSchema: Yup.object().shape({
			entregado_a: Yup.string().required("Requerido").nonNullable("Requerido"),
		}),
		onSubmit: async (values) => {
			if (sigCanvas.current?.isEmpty()) {
				toast.error("Por favor firme la entrega", { toastId: "firma-entrega" });
				return;
			}

			try {
				const endpoint =
					trabajoTipo === "servicio"
						? `/api/ordenes-de-trabajo/${ordenId}/servicios-generales/${trabajoId}/completar-trabajo/`
						: `/api/ordenes-de-trabajo/${ordenId}/soportes-tecnicos/${trabajoId}/completar-trabajo/`;

				const response = await ApiService.fetchData({
					url: endpoint,
					method: "post",
					headers: { "Content-Type": "application/json" },
					data: JSON.stringify({
						firma_entrega: sigCanvas.current?.toDataURL("image/png"),
						entregado_a: values.entregado_a,
						estado: estadoFinal,
					}),
				});

				if (response.data) {
					toast.success("Trabajo completado y firmado exitosamente", { autoClose: 1500 });
					clear();
					setIsOpen(false);
					onSuccess && onSuccess();
				}
			} catch (error: any) {
				toast.error(
					error.response?.data?.detail ||
						error.response?.data ||
						"Error al completar el trabajo",
					{ toastId: "error-firma-completar" },
				);
			}
		},
	});

	return (
		<Modal
			size="md"
			isOpen={isOpen}
			setIsOpen={setIsOpen}
			isStaticBackdrop={true}
			isCentered={true}
			isScrollable={true}
		>
			<ModalHeader>
				<Badge className="text-xl">Confirmar Recepción del Trabajo</Badge>
			</ModalHeader>
			<ModalBody>
				<div className="space-y-4">
					<div ref={topRef} />
				{/* Información con comentarios sin paréntesis y saltos de línea */}
				<div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
					<div className="text-sm font-medium text-blue-900 leading-relaxed space-y-2">
						<div>
							El técnico <span className="font-bold">{tecnicoNombre}</span> realizó los siguientes trabajos:
						</div>
						<div className="ml-4">
							{comentariosTecnicos && comentariosTecnicos.length > 0
								? comentariosTecnicos.map((c, idx) => (
									<div key={idx} className="font-semibold">
										• {c.comentario}
									</div>
								))
								: <div className="font-semibold italic text-blue-700">Sin comentarios registrados</div>
							}
						</div>
						<div className="pt-2 border-t border-blue-200">
							Usted <span className="font-bold" id="nombre-receptor">seleccione receptor</span>, ¿Está de acuerdo con el resultado del trabajo realizado?
						</div>
					</div>
				</div>

				{/* Selector de usuario receptor */}
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-2">
						Seleccione quien recibe el trabajo:
					</label>
					<Validation
						isValid={formik.isValid}
						isTouched={formik.touched.entregado_a}
						invalidFeedback={formik.errors.entregado_a || "Requerido"}>
						<SelectReact
							id="entregado_a"
							name="entregado_a"
							placeholder="Seleccione quien recibe..."
							options={usuariosOptions}
							value={
								usuariosOptions.find((opt) => opt.value === formik.values.entregado_a) ||
								null
							}
							onChange={(option: any) => {
								formik.setFieldValue("entregado_a", option?.value || "");
								// Actualizar el nombre en el texto dinámico
								const selectedLabel = option?.label || 'seleccione receptor';
								const receptorElement = document.getElementById('nombre-receptor');
								if (receptorElement) {
									receptorElement.textContent = selectedLabel;
								}
							}}
							onBlur={formik.handleBlur}
						/>
					</Validation>
				</div>
					<div className="space-y-2">
						<label className="block text-sm font-medium text-gray-700">
							Firma de conformidad:
						</label>
						<div className="rounded-lg border-2 border-gray-300 bg-white overflow-auto flex justify-center">
							<SignatureCanvas
								ref={sigCanvas}
								canvasProps={{
									className: "bg-white",
									height: 280,
									width: 400,
								}}
							/>
						</div>
						<Button size="sm" variant="outline" color="gray" onClick={clear}>
							Limpiar firma
						</Button>
					</div>
				</div>
			</ModalBody>
			<ModalFooter>
				<ModalFooterChild>
					<Button variant="outline" color="red" onClick={() => setIsOpen(false)}>
						Cancelar
					</Button>
				</ModalFooterChild>
				<ModalFooterChild>
					<Button
						variant="solid"
						color="emerald"
						onClick={() => formik.handleSubmit()}
						isDisable={!formik.isValid || !formik.dirty}>
						Confirmar Recepción
					</Button>
				</ModalFooterChild>
			</ModalFooter>
		</Modal>
	);
}

export default FirmarCompletarTrabajo;
