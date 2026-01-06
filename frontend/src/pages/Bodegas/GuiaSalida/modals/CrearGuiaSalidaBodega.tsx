import Checkbox from "@/components/form/Checkbox"
import Input from "@/components/form/Input"
import SelectReact, { TSelectOption } from "@/components/form/SelectReact"
import Textarea from "@/components/form/Textarea"
import Validation from "@/components/form/Validation"
import Icon from "@/components/icon/Icon"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Table, { THead, Tr, Th, TBody, Td } from "@/components/ui/Table"
import Tooltip from "@/components/ui/Tooltip"
import { IGuiaSalida } from "@/interface/bodega.interface"
import { IUsuarioEmpresa } from "@/interface/empresas.interface"
import ApiService from "@/services/ApiService"
import { listaBodegasThunk, listaGuiaSalidaPorBodegaThunk, listaMisClientesThunk, listaUsuariosTodaLaEmpresaThunk, useAppDispatch, useAppSelector, usuarioEmpresaLogeadoThunk } from "@/store"
import TableCardFooterTemplateV2 from "@/templates/Table/TableFooterTemplateV2"
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel, SortingState, createColumnHelper, flexRender } from "@tanstack/react-table"
import { useFormik } from "formik"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import * as Yup from 'yup'


const columnHelper = createColumnHelper<IUsuarioEmpresa>()

function CrearGuiaSalidaBodega() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { personalizacionUsuario, userMe } = useAppSelector((state) => state.auth)
    const { usuarioEmpresaLogeado, listaUsuariosTodaLaEmpresa, listaMisClientes } = useAppSelector((state) => state.empresa)
    const { listaBodegas } = useAppSelector((state) => state.bodega)
    const [isOpen, setIsOpen] = useState<boolean>(false)
    const [optBodegas, setOptBodegas] = useState<{value: string, label: string}[]>([])
    const [optUsuarios, setOptUsuarios] = useState<IUsuarioEmpresa[]>([])
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');
    const [userSelect, setUserSelect] = useState<IUsuarioEmpresa | undefined>()

    useEffect(() => {
        if (isOpen && personalizacionUsuario && personalizacionUsuario.empresa) {
            dispatch(listaBodegasThunk())
            dispatch(listaMisClientesThunk({id_empresa: personalizacionUsuario.empresa}))
            dispatch(listaUsuariosTodaLaEmpresaThunk({id_empresa: personalizacionUsuario.empresa}))
            dispatch(usuarioEmpresaLogeadoThunk({id_usuario: userMe?.pk}))
        }
    }, [isOpen, personalizacionUsuario])

    useEffect(() => {
        if (listaUsuariosTodaLaEmpresa.length > 0) {
            setOptUsuarios(listaUsuariosTodaLaEmpresa)
        }
    }, [listaUsuariosTodaLaEmpresa])

    useEffect(() => {
        if (listaBodegas.length > 0) {
            setOptBodegas(listaBodegas.map(bod => {return {value: bod.id.toString(), label: bod.nombre}}))
        }
    }, [listaBodegas])

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            cliente: "",
            bodega: "",
            motivo: "",
        },
        validationSchema: Yup.object().shape({
            cliente: Yup.string().required("Requerido").nonNullable("Requerido"),
            bodega: Yup.string().required("Requerido").nonNullable("Requerido"),
            motivo: Yup.string().nonNullable("No puede ser nulo").notRequired(),
        }),
        onSubmit: async (values) => {
            try {
                let data = {}
                if (userSelect) {
                    data = {
                        ...values,
                        sucursal: personalizacionUsuario?.sucursal_principal,
                        recibido_por: userSelect.id,
                        creado_por: usuarioEmpresaLogeado?.id,
                    }
                } else {
                    data = {
                        ...values,
                        sucursal: personalizacionUsuario?.sucursal_principal,
                        creado_por: usuarioEmpresaLogeado?.id,
                    }
                }
                const response = await ApiService.fetchData<IGuiaSalida, string>({url: `/api/guia-salida/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify(data)})
                if (response.data) {
                    toast.success("Guia de salida de bodega creada", {autoClose: 1000})
                    // dispatch(listaGuiaSalidaPorBodegaThunk({id_bodega}))
                    setIsOpen(false)
                    formik.resetForm()
                    navigate(`/bodega/detalle-guia-salida-bodega/${response.data.id}`)
                }
            } catch (error: any) {
                toast.error(error.response.data)
            }
        }
    })

    const columns = [
        columnHelper.accessor("nombre_usuario", {
            cell: (info) => info.getValue(),
            header: "Nombre"
        }),
        columnHelper.accessor("email_usuario", {
            cell: (info) => info.getValue(),
            header: "Correo"
        }),
        columnHelper.display({
            id: "acciones",
            cell: (info) => (
                <div>
                    <Checkbox
                        checked={userSelect?.id === info.row.original.id}
                        disabled={userSelect && userSelect.id !== info.row.original.id}
                        onChange={(e) => {
                            if (e.target.checked) {
                                setUserSelect(info.row.original)
                            } else {
                                setUserSelect(undefined)
                            }
                        }}
                    />
                </div>
            ),
            header: ""
        })
    ]

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
        getPaginationRowModel: getPaginationRowModel()
    });

    return (
        <>
            <Tooltip text="Crear Guia de Salida">
                <Button variant="solid" onClick={() => {setIsOpen(true)}} icon="HeroPlus"></Button>
            </Tooltip>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className="text-xl">Crear Guia de Salida</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div className="w-full">
                            <Badge>Cliente</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.cliente}
                                invalidFeedback={formik.errors.cliente}
                            >
                                <SelectReact
                                    name="cliente"
                                    options={listaMisClientes.map(cliente => ({ value: cliente.info_cliente.id.toString(), label: cliente.info_cliente.nombre }))}
                                    placeholder="Seleccione un Cliente"
                                    value={listaMisClientes.map(cliente => ({ value: cliente.info_cliente.id.toString(), label: cliente.info_cliente.nombre })).find(option => option.value === formik.values.cliente)}
                                    noOptionsMessage={(e) => `No existe ${e.inputValue}`}
                                    onBlur={formik.handleBlur}
                                    onChange={(e) => {formik.setFieldValue('cliente', (e as TSelectOption).value)}}
                                />
                            </Validation>
                        </div>
                        <div className="w-full">
                            <Badge>Bodega</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.bodega}
                                invalidFeedback={formik.errors.bodega}
                            >
                                <SelectReact
                                    name="bodega"
                                    options={optBodegas}
                                    placeholder="Seleccione una Bodega"
                                    value={{value: formik.values.bodega, label: optBodegas.find(element => element.value === formik.values.bodega)?.label || ""}}
                                    noOptionsMessage={(e) => `No existe ${e.inputValue}`}
                                    onBlur={formik.handleBlur}
                                    onChange={(e) => {formik.setFieldValue('bodega', (e as TSelectOption).value)}}
                                />
                            </Validation>
                        </div>
                        <div className="w-full">
                            <Badge>Motivo</Badge>
                            <Validation
                                isValid={formik.isValid}
                                isTouched={formik.touched.motivo}
                                invalidFeedback={formik.errors.motivo}
                            >
                                <Textarea 
                                    name="motivo"
                                    onBlur={formik.handleBlur}
                                    value={formik.values.motivo}
                                    onChange={formik.handleChange}
                                />
                            </Validation>
                        </div>
                        <div className="w-full">
                            <div className="mb-2 flex items-center justify-between gap-4">
                                <Badge>Recibido Por</Badge>
                                <Input
                                    className="max-w-[200px]"
                                    name="globalFilter"
                                    placeholder="Buscar..."
                                    value={globalFilter}
                                    onChange={(e) => { setGlobalFilter(e.target.value) }}
                                />
                            </div>
                            <div className="overflow-auto">
                                <Table className='table-fixed min-w-[400px]'>
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
                                                                    className: header.column.getCanSort()
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
                                                                }[header.column.getIsSorted() as string] ?? null}
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
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </Td>
                                                ))}
                                            </Tr>
                                        ))}
                                    </TBody>
                                </Table>
                                <div className="mt-2 min-w-[400px]">
                                    <TableCardFooterTemplateV2 table={table} />
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <ModalFooterChild></ModalFooterChild>
                    <ModalFooterChild>
                        <Button color="red" onClick={() => {formik.resetForm(); setIsOpen(false)}}>Cancelar</Button>
                        <Button variant="solid" onClick={() => {formik.handleSubmit()}}>Crear</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default CrearGuiaSalidaBodega
