import { IContratoEmpresaCliente } from '@/interface/contrato.interface';
import classNames from 'classnames';
import dayjs from 'dayjs';
import { Fragment, RefObject } from 'react';

function PDFContratoServicios({
    contrato,
    componentRef,
}: {
    contrato: IContratoEmpresaCliente;
    componentRef: RefObject<HTMLDivElement>;
}) {
    return (
        <div className='h-full w-full border-2 border-black md:max-w-[800px]'>
            <div className='flex flex-col gap-4 p-8' ref={componentRef}>
                <div className='flex flex-row items-center justify-between gap-4'>
                    <div className='text-center text-xl text-gray-400 md:text-2xl'>
                        {dayjs().locale('es').format('DD [de] MMMM [del] YYYY')}
                    </div>
                    <div className='max-h-[50px] max-w-[100px] md:max-h-[50px] md:max-w-[100px]'>
                        {contrato.datos_empresa.logo && (
                            <img
                                src={contrato.datos_empresa.logo}
                                alt={contrato.datos_empresa.nombre}
                                className='max-h-[50px] max-w-[100px] object-contain'
                            />
                        )}
                    </div>
                </div>
                <div className='text-center text-xl font-bold md:text-2xl'>{contrato.nombre}</div>
                <div>
                    Entre {contrato.datos_empresa.nombre}, domiliciada en{' '}
                    {contrato.datos_empresa.direccion_principal}, por una parte y el Cliente
                    individualizado en la Cláusu la primera de este contrato, en adelante{' '}
                    <strong>“EL CLIENTE”</strong>, por otra parte, se ha convenido el siguiente
                    contrato de servicios, que se regirá por las cláusulas del presente contrato,
                    ambas partes deben declarar conocer y aceptar en su totalidad.
                </div>
                <div className='text-xl font-bold md:text-2xl'>
                    1.-IDENTIFICACION DE “EL CLIENTE” ({contrato.datos_cliente.nombre})
                </div>
                <div className='grid grid-cols-6'>
                    <div className='col-span-2 border border-black p-1'>Nombre o Razón Social</div>
                    <div className='col-span-4 border border-r-black border-t-black p-1'>
                        {contrato.datos_cliente.nombre}
                    </div>
                    <div className='col-span-2 border border-x-black border-b-black p-1'>R.U.T</div>
                    <div className='col-span-4 border border-r-black border-t-black p-1'>
                        {contrato.datos_cliente.rut_empresa || 'Sin Rut'}
                    </div>
                    <div className='col-span-2 border border-x-black border-b-black p-1'>
                        Domicilio
                    </div>
                    <div className='col-span-4 border border-r-black border-t-black p-1'>
                        {contrato.datos_cliente.direccion_principal || 'Sin Direccion Principal'}
                    </div>
                    {/* <div className="col-span-2 p-1 border border-b-black border-x-black">Giro o Actividad</div>
                    <div className="col-span-4 p-1 border border-t-black border-r-black">{"Sin Giro o Actividad"}</div> */}
                    {contrato.datos_cliente.representantes_legales.length > 0 && (
                        <>
                            <div className='col-span-2 border border-x-black border-b-black p-1'>
                                Representante Legal
                            </div>
                            <div className='col-span-4 border border-r-black border-t-black p-1'>
                                {contrato.datos_cliente.representantes_legales[0].nombre_usuario}
                            </div>
                            <div className='col-span-2 border border-x-black border-b-black p-1'>
                                R.U.T
                            </div>
                            <div className='col-span-4 border border-r-black border-t-black p-1'>
                                {contrato.datos_cliente.representantes_legales[0].papeleta.rut ||
                                    'Sin Rut'}
                            </div>
                            <div className='col-span-2 border border-x-black border-b-black p-1'>
                                E-mail
                            </div>
                            <div className='col-span-4 border border-y-black border-r-black p-1'>
                                {contrato.datos_cliente.representantes_legales[0].email_usuario}
                            </div>
                        </>
                    )}
                </div>
                <div className='text-xl font-bold md:text-2xl'>2.- TIPO DE PLAN Y SERVICIOS</div>
                <div className='flex flex-col'>
                    {contrato.items_comerciales.length > 0 ? (
                        contrato.items_comerciales.map((item, index) => (
                            <Fragment key={index}>
                                <div className='flex items-center gap-4 text-lg font-semibold'>
                                    <div className='h-2 w-2 rounded-full bg-black'></div>
                                    {item.snapshot_nombre}
                                </div>
                                <div className='ml-8'>{item.snapshot_descripcion}</div>
                                <div className='ml-8'>
                                    Valor: {item.moneda === 'CLP' && '$'}
                                    {(Number(item.precio_unitario_contratado) * item.cantidad).toLocaleString('es-ES')}
                                    {item.moneda !== 'CLP' && ` ${item.moneda}`}
                                </div>
                            </Fragment>
                        ))
                    ) : contrato.contrato_servicios.length > 0 ? (
                        contrato.contrato_servicios.map((servicio, index) => (
                            <Fragment key={index}>
                                <div className='flex items-center gap-4 text-lg font-semibold'>
                                    <div className='h-2 w-2 rounded-full bg-black'></div>
                                    {servicio.servicio_generico.nombre}
                                </div>
                                <div className='ml-8'>{servicio.servicio_generico.descripcion}</div>
                                <div className='ml-8'>
                                    Valor Fijo: $
                                    {Number(servicio.precio_unitario) * servicio.cantidad}
                                </div>
                            </Fragment>
                        ))
                    ) : (
                        <div>Sin Planes o Servicios</div>
                    )}
                </div>
                <div className='text-xl font-bold md:text-2xl'>
                    3.- DESCRIPCION DETALLADA DE PLANES Y SERVICIOS
                </div>
                <div className='flex flex-col'>
                    {contrato.items_comerciales.length > 0 ? (
                        contrato.items_comerciales.map((item, index) => (
                            <div
                                key={index}
                                className={classNames(
                                    index > 0
                                        ? 'border border-x-black border-b-black p-1'
                                        : 'border border-black p-1',
                                )}>
                                <div>
                                    <strong>{item.snapshot_nombre}</strong>
                                    {item.tipo_origen === 'plan' && (
                                        <span className='ml-1 text-xs text-gray-500'>(Plan)</span>
                                    )}
                                </div>
                                {item.snapshot_descripcion && (
                                    <div className='ml-4'>{item.snapshot_descripcion}</div>
                                )}
                                {item.snapshot_incluye && (
                                    <div className='ml-4'>
                                        <strong>Incluye: </strong>{item.snapshot_incluye}
                                    </div>
                                )}
                                {item.snapshot_no_incluye && (
                                    <div className='ml-4'>
                                        <strong>No incluye: </strong>{item.snapshot_no_incluye}
                                    </div>
                                )}
                                {item.snapshot_componentes_plan.length > 0 && (
                                    <div className='ml-4'>
                                        <strong>Componentes: </strong>
                                        {item.snapshot_componentes_plan.map((c, ci) => (
                                            <div key={ci} className='ml-4'>{c.nombre || String(c)}</div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : contrato.contrato_servicios.length > 0 ? (
                        contrato.contrato_servicios.map((servicio, index) => (
                            <Fragment key={index}>
                                {'servicios' in servicio.servicio_generico ? (
                                    <div
                                        className={classNames(
                                            index > 0
                                                ? 'border border-x-black border-b-black p-1'
                                                : 'border border-black p-1',
                                        )}>
                                        <div>
                                            <strong>{servicio.servicio_generico.nombre}: </strong>
                                            {servicio.servicio_generico.descripcion}
                                        </div>
                                        {servicio.servicio_generico.servicios.map(
                                            (ser, indexPlan) => (
                                                <Fragment key={indexPlan}>
                                                    <div className='ml-4'>
                                                        <strong>{ser.nombre}: </strong>
                                                        {ser.descripcion}
                                                    </div>
                                                    {ser.caracteristicas.map(
                                                        (caracteristica, indexCarac) => (
                                                            <div key={indexCarac} className='ml-8'>
                                                                <strong>
                                                                    {caracteristica.nombre}:{' '}
                                                                </strong>
                                                                {caracteristica.descripcion}
                                                            </div>
                                                        ),
                                                    )}
                                                </Fragment>
                                            ),
                                        )}
                                    </div>
                                ) : (
                                    <div
                                        className={classNames(
                                            index > 0
                                                ? 'border border-x-black border-b-black p-1'
                                                : 'border border-black p-1',
                                        )}>
                                        <div>
                                            <strong>{servicio.servicio_generico.nombre}: </strong>{' '}
                                            {servicio.servicio_generico.descripcion}
                                        </div>
                                        {servicio.servicio_generico.caracteristicas.map(
                                            (caracteristica, indexCarac) => (
                                                <div key={indexCarac} className='ml-4'>
                                                    <strong>{caracteristica.nombre}: </strong>
                                                    {caracteristica.descripcion}
                                                </div>
                                            ),
                                        )}
                                    </div>
                                )}
                            </Fragment>
                        ))
                    ) : (
                        <div>Sin Planes o Servicios</div>
                    )}
                </div>
                <div className='grid h-[150px] grid-cols-2 gap-2'>
                    <div className='flex items-center justify-center'>
                        <div className='border border-x-0 border-b-0 border-t-black px-8'>
                            Firma y Timbre del Cliente
                        </div>
                    </div>
                    <div className='flex items-center justify-center'>
                        <div className='border border-x-0 border-b-0 border-t-black px-8'>
                            Firma y Timbre de la Empresa
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PDFContratoServicios;
