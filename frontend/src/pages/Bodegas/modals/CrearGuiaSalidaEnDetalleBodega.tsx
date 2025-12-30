import Checkbox from "@/components/form/Checkbox"
import Input from "@/components/form/Input"
import Textarea from "@/components/form/Textarea"
import Icon from "@/components/icon/Icon"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import Modal, { ModalBody, ModalFooter, ModalFooterChild, ModalHeader } from "@/components/ui/Modal"
import Table, { TBody, Td, Th, THead, Tr } from "@/components/ui/Table"
import { IUsuarioEmpresa } from "@/interface/empresas.interface"
import ApiService from "@/services/ApiService"
import { detalleBodegaThunk, listaUsuariosTodaLaEmpresaThunk, useAppDispatch, useAppSelector } from "@/store"
import TableCardFooterTemplateV2 from "@/templates/Table/TableFooterTemplateV2"
import { createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table"
import { useFormik } from "formik"
import { Dispatch, SetStateAction, useEffect, useState } from "react"
import { toast } from "react-toastify"
import * as Yup from 'yup'


const columnHelper = createColumnHelper<IUsuarioEmpresa>()

function CrearGuiaSalidaEnDetalleBodega({isOpen, setIsOpen, id_bodega} : {isOpen: boolean, setIsOpen: Dispatch<SetStateAction<boolean>>, id_bodega: number | undefined}) {
    const dispatch = useAppDispatch()
    const { personalizacionUsuario } = useAppSelector((state) => state.auth)
    const { listaUsuariosTodaLaEmpresa, detalleUsuarioEmpresa } = useAppSelector((state) => state.empresa)
    const [optUsuarios, setOptUsuarios] = useState<IUsuarioEmpresa[]>([])
    const [userSelect, setUserSelect] = useState<IUsuarioEmpresa | undefined>()
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState<string>('');

    useEffect(() => {
        setOptUsuarios(listaUsuariosTodaLaEmpresa)
    }, [listaUsuariosTodaLaEmpresa])

    useEffect(() => {
        if (isOpen && personalizacionUsuario && personalizacionUsuario.empresa) {
            dispatch(listaUsuariosTodaLaEmpresaThunk({ id_empresa: personalizacionUsuario.empresa }))
        }
    }, [isOpen, personalizacionUsuario])

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
                <div className="flex justify-end">
                    <Checkbox
                        onChange={(e) => {
                            if (e.target.checked) {
                                setUserSelect(info.row.original)
                            } else {
                                setUserSelect(undefined)
                            }
                        }}
                        checked={userSelect?.id === info.row.original.id}
                        disabled={userSelect && userSelect.id !== info.row.original.id}
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

    const formik = useFormik({
        enableReinitialize: true,
        initialValues: {
            motivo: "",
        },
        validationSchema: Yup.object().shape({
            motivo: Yup.string().nonNullable("No puede ser nulo").notRequired(),
        }),
        onSubmit: async (values) => {
            if (userSelect) {
                try {
                    const response = await ApiService.fetchData({url: `/api/guia-salida/`, method: 'post', headers: {'Content-Type': 'application/json'}, data: JSON.stringify({
                        ...values,
                        bodega: id_bodega,
                        sucursal: personalizacionUsuario?.sucursal_principal,
                        recibido_por: userSelect.id,
                        creado_por: detalleUsuarioEmpresa?.id,
                    })})
                    if (response.data) {
                        toast.success("Guia de salida de bodega creada", {autoClose: 1000})
                        dispatch(detalleBodegaThunk({id_bodega}))
                        formik.resetForm()
                        setIsOpen(false)
                    }
                } catch (error: any) {
                    toast.error(error.response.data)
                }
            } else {
                toast.error("Eliga a un usuario para entregarle los items")
            }
        }
    })

    return (
        <>
            <Button variant="solid" onClick={() => {setIsOpen(true)}}>Crear Guia de Salida para esta Bodega</Button>
            <Modal isOpen={isOpen} setIsOpen={setIsOpen} isStaticBackdrop={true}>
                <ModalHeader>
                    <Badge className="text-xl">Crear Guia de Salida</Badge>
                </ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-4">
                        <div className="w-full">
                            <Badge>Motivo</Badge>
                            <Textarea
                                name="motivo"
                                onBlur={formik.handleBlur}
                                value={formik.values.motivo}
                                onChange={formik.handleChange}
                            />
                        </div>
                        <div className="w-full">
                            <div className="mb-2 justify-end flex">
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
                        <Button color="red" onClick={() => {setIsOpen(false); formik.resetForm()}}>Cancelar</Button>
                        <Button variant="solid" onClick={() => {formik.handleSubmit()}}>Crear</Button>
                    </ModalFooterChild>
                </ModalFooter>
            </Modal>
        </>
    )
}

export default CrearGuiaSalidaEnDetalleBodega