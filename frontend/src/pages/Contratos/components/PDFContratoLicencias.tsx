import { IContratoEmpresaCliente } from "@/interface/contrato.interface"
import classNames from "classnames"
import dayjs from "dayjs"
import { useRef, Fragment, RefObject } from "react"


function PDFContratoLicencias({contrato, componentRef} : {contrato : IContratoEmpresaCliente, componentRef: RefObject<HTMLDivElement>}) {

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
                <div className="font-bold text-xl md:text-2xl">2.- SERVICIO</div>
                <div className="flex flex-col">
                    {contrato.contrato_servicios.length > 0 ? (
                        contrato.contrato_servicios.map((servicio, index) => (
                            <Fragment key={index}>
                                <div className="flex items-center gap-4 text-lg font-semibold">
                                    <div className="w-2 h-2 rounded-full bg-black"></div>{servicio.servicio_generico.nombre}
                                </div>
                                <div className="ml-8">{servicio.servicio_generico.descripcion}</div>
                                <div className="ml-8">Valor Fijo: {contrato.contrato_licencias.length > 0 && contrato.contrato_licencias[0].tipo_moneda === "CLP" && "$"}{Number(servicio.precio_unitario)}{contrato.contrato_licencias.length > 0 && contrato.contrato_licencias[0].tipo_moneda === "USD" && "USD"}</div>
                            </Fragment>
                        ))
                    ) : (
                        <div>Sin Planes o Servicios</div>
                    )}
                </div>
                <div className="font-bold text-xl md:text-2xl">3.- LICENCIAS</div>
                <div className="flex flex-col">
                    {contrato.contrato_licencias.length > 0 ? (
                        contrato.contrato_licencias.map((licencia, index) => (
                            <Fragment key={index}>
                                <div className="flex items-center gap-4 text-lg font-semibold">
                                    <div className="w-2 h-2 rounded-full bg-black"></div>{licencia.nombre_licencia}
                                </div>
                                <div className="ml-8">Modalidad: {licencia.tipo_modalidad != "otros" ? licencia.tipo_modalidad_label : licencia.otro_tipo}</div>
                                <div className="ml-8">Cantidad: {licencia.cantidad}</div>
                                <div className="ml-8">Valor Unitario: {licencia.tipo_moneda === "CLP" && "$"}{Number(licencia.precio_unitario).toLocaleString("es-ES")} {licencia.tipo_moneda === "USD" && "USD"}</div>
                            </Fragment>
                        ))
                    ) : (
                        <div>Sin Licencias</div>
                    )}
                </div>
                {/* <div className="font-bold text-xl md:text-2xl">3.- DESCRIPCION DETALLADA DE PLANES Y SERVICIOS</div>
                <div className="flex flex-col">
                    {contrato.contrato_servicios.length > 0 ? (
                        contrato.contrato_servicios.map((servicio, index) => (
                            <Fragment key={index}>
                                {"servicios" in servicio.servicio_generico ? (
                                    <div className={classNames(index > 0 ? "border border-x-black border-b-black p-1" : "border border-black p-1")}>
                                        <div><strong>{servicio.servicio_generico.nombre}: </strong>{servicio.servicio_generico.descripcion}</div>
                                        {servicio.servicio_generico.servicios.map((ser, indexPlan) => (
                                            <Fragment key={indexPlan}>
                                                <div className="ml-4"><strong>{ser.nombre}: </strong>{ser.descripcion}</div>
                                                {ser.caracteristicas.map((caracteristica, indexCarac) => (
                                                    <div key={indexCarac} className="ml-8"><strong>{caracteristica.nombre}: </strong>{caracteristica.descripcion}</div>
                                                ))}
                                            </Fragment>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={classNames(index > 0 ? "border border-x-black border-b-black p-1" : "border border-black p-1")}>
                                        <div><strong>{servicio.servicio_generico.nombre}: </strong> {servicio.servicio_generico.descripcion}</div>
                                        {servicio.servicio_generico.caracteristicas.map((caracteristica, indexCarac) => (
                                            <div key={indexCarac} className="ml-4"><strong>{caracteristica.nombre}: </strong>{caracteristica.descripcion}</div>
                                        ))}
                                    </div>
                                )}
                            </Fragment>
                        ))
                    ) : (
                        <div>Sin Planes o Servicios</div>
                    )}
                </div> */}
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

export default PDFContratoLicencias