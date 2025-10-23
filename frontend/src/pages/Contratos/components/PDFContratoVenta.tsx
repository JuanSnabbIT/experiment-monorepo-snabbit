import { IContratoEmpresaCliente } from "@/interface/contrato.interface"
import classNames from "classnames"
import dayjs from "dayjs"
import { useRef, Fragment, RefObject } from "react"


function PDFContratoVenta({contrato, componentRef} : {contrato : IContratoEmpresaCliente, componentRef: RefObject<HTMLDivElement>}) {

    return (
        <div className="h-full w-full md:max-w-[800px] border-2 border-black">
            <div className="flex flex-col gap-4 p-8" ref={componentRef}>
                <div className="flex flex-row gap-4 items-center justify-between">
                    <div className="text-gray-400 text-xl md:text-2xl text-center">{dayjs().locale('es').format("DD [de] MMMM [del] YYYY")}</div>
                    <div className="md:max-w-[100px] md:max-h-[50px] max-w-[100px] max-h-[50px]">
                        <img src="/src/assets/isabella-fischer-6ast1xZ9YJY-unsplash-thumb.jpg" />
                    </div>
                </div>
                <div className="text-xl md:text-2xl text-center font-bold">{contrato.nombre}</div>
                <div>
                    Entre {contrato.datos_empresa.nombre}, domiliciada en {contrato.datos_empresa.direccion_principal}, por una parte 
                    y el Cliente individualizado en la Cláusu   la primera de este contrato, en adelante <strong>“EL CLIENTE”</strong>, 
                    por otra parte, se ha convenido el siguiente contrato de servicios, que se regirá por las cláusulas del presente contrato, ambas partes deben declarar conocer y aceptar en su totalidad.
                </div>
                <div className="font-bold text-xl md:text-2xl">
                    1.-IDENTIFICACION DE “EL CLIENTE” ({contrato.datos_cliente.nombre})
                </div>
                <div className="grid grid-cols-6">
                    <div className="col-span-2 p-1 border border-black">Nombre o Razón Social</div>
                    <div className="col-span-4 p-1 border border-r-black border-t-black">{contrato.datos_cliente.nombre}</div>
                    <div className="col-span-2 p-1 border border-b-black border-x-black">R.U.T</div>
                    <div className="col-span-4 p-1 border border-t-black border-r-black">{contrato.datos_cliente.rut_empresa || "Sin Rut"}</div>
                    <div className="col-span-2 p-1 border border-b-black border-x-black">Domicilio</div>
                    <div className="col-span-4 p-1 border border-t-black border-r-black">{contrato.datos_cliente.direccion_principal || "Sin Direccion Principal"}</div>
                    {/* <div className="col-span-2 p-1 border border-b-black border-x-black">Giro o Actividad</div>
                    <div className="col-span-4 p-1 border border-t-black border-r-black">{"Sin Giro o Actividad"}</div> */}
                    {contrato.datos_cliente.representantes_legales.length > 0 && (
                        <>
                            <div className="col-span-2 p-1 border border-b-black border-x-black">Representante Legal</div>
                            <div className="col-span-4 p-1 border border-t-black border-r-black">{contrato.datos_cliente.representantes_legales[0].nombre_usuario}</div>
                            <div className="col-span-2 p-1 border border-b-black border-x-black">R.U.T</div>
                            <div className="col-span-4 p-1 border border-t-black border-r-black">{contrato.datos_cliente.representantes_legales[0].papeleta.rut || "Sin Rut"}</div>
                            <div className="col-span-2 p-1 border border-b-black border-x-black">E-mail</div>
                            <div className="col-span-4 p-1 border border-y-black border-r-black">{contrato.datos_cliente.representantes_legales[0].email_usuario}</div>
                        </>
                    )}
                </div>
                <div className="font-bold text-xl md:text-2xl">2.- DESCRIPCIÓN</div>
                <div className="ml-4">{contrato.observaciones}</div>
                <div className="h-[150px] grid grid-cols-2 gap-2">
                    <div className="flex justify-center items-center">
                        <div className="border border-b-0 border-x-0 border-t-black px-8">
                            Firma y Timbre del Cliente
                        </div>
                    </div>
                    <div className="flex justify-center items-center">
                        <div className="border border-b-0 border-x-0 border-t-black px-8">
                            Firma y Timbre de la Empresa
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PDFContratoVenta