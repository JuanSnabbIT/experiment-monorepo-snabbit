import { TSelectOption } from '@/components/form/SelectReact';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card, { CardBody, CardHeader, CardHeaderChild } from '@/components/ui/Card';
import Tooltip from '@/components/ui/Tooltip';
import CrearContratoDelCliente from '@/pages/Contratos/modals/CrearContratoDelCliente';
import ApiService from '@/services/ApiService';
import { listaContentTypeThunk, useAppDispatch, useAppSelector } from '@/store';
import {
    LIMPIAR_DETALLE_CONTRATO,
    listaContratosDeEmpresaYClienteThunk,
} from '@/store/slices/contratos/contratoSlice';
import classNames from 'classnames';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

function TablaDeContratosDelCliente() {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { personalizacionUsuario } = useAppSelector((state) => state.auth);
    const { listaContentType } = useAppSelector((state) => state.core);
    const { detalleCliente } = useAppSelector((state) => state.empresa);
    const { listaContratosDeEmpresaYCliente } = useAppSelector((state) => state.contrato);
    const [optionsContratos, setOptionsContratos] = useState<TSelectOption[]>([]);

    useEffect(() => {
        if (personalizacionUsuario && personalizacionUsuario.empresa && detalleCliente) {
            dispatch(
                listaContratosDeEmpresaYClienteThunk({
                    id_cliente: detalleCliente.cliente,
                    id_empresa: personalizacionUsuario.empresa,
                }),
            );
        }
        if (listaContentType.length === 0) {
            dispatch(listaContentTypeThunk());
        }

        return () => {
            dispatch(LIMPIAR_DETALLE_CONTRATO());
        };
    }, [detalleCliente, personalizacionUsuario]);

    useEffect(() => {
        if (listaContratosDeEmpresaYCliente.length > 0) {
            setOptionsContratos(
                listaContratosDeEmpresaYCliente.map((cont) => ({
                    value: cont.id.toString(),
                    label: cont.nombre,
                })),
            );
        }
    }, [listaContratosDeEmpresaYCliente]);

    return (
        <Card>
            <CardHeader>
                <CardHeaderChild>
                    <Badge className='text-xl'>Contratos</Badge>
                </CardHeaderChild>
                <CardHeaderChild>
                    <CrearContratoDelCliente />
                </CardHeaderChild>
            </CardHeader>
            <CardBody>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                    {listaContratosDeEmpresaYCliente.length > 0
                        ? listaContratosDeEmpresaYCliente.map((contrato, index) => (
                              <Card key={index} className='rounded-xl border border-blue-500'>
                                  <CardHeader>
                                      <CardHeaderChild>
                                          <Badge className='text-xl'>{contrato.nombre}</Badge>
                                      </CardHeaderChild>
                                      <CardHeaderChild>
                                          <Button
                                              variant='solid'
                                              color='violet'
                                              icon='HeroEye'
                                              onClick={() => {
                                                  navigate(
                                                      `/empresa/contratos-cliente/${detalleCliente?.id}?contrato=${contrato.id}`,
                                                  );
                                              }}
                                          />
                                          <Tooltip text='PDF'>
                                              <Button
                                                  variant='solid'
                                                  color='red'
                                                  icon='HeroDocument'
                                                  onClick={() => {
                                                      navigate(`/pdf-contrato/${contrato.id}/12`);
                                                  }}
                                              />
                                          </Tooltip>
                                          <Button
                                              variant='solid'
                                              color='amber'
                                              icon='HeroDocument'
                                              onClick={async () => {
                                                  try {
                                                      const response =
                                                          await ApiService.fetchData<BlobPart>({
                                                              url: `/api/contratos/${contrato.id}/pdf/`,
                                                              method: 'get',
                                                              headers: {
                                                                  'Content-Type': 'application/pdf',
                                                              },
                                                          });
                                                      const url = window.URL.createObjectURL(
                                                          new Blob([response.data]),
                                                      );
                                                      const a = document.createElement('a');
                                                      a.href = url;
                                                      a.download = `nombre_front_${contrato.id}.pdf`;
                                                      document.body.appendChild(a);
                                                      a.click();
                                                      a.remove();
                                                      window.URL.revokeObjectURL(url);
                                                  } catch (error: any) {
                                                      toast.error(error.response.data);
                                                  }
                                              }}
                                          />
                                      </CardHeaderChild>
                                  </CardHeader>
                                  <CardBody>
                                      <div className='grid grid-cols-1 gap-4'>
                                          <div>
                                              <span className='font-bold text-blue-500'>
                                                  Vigencia:{' '}
                                              </span>
                                              {dayjs(contrato.fecha_inicio).format('DD/MM/YYYY') +
                                                  ' '}
                                              -{' '}
                                              {contrato.fecha_fin
                                                  ? dayjs(contrato.fecha_fin).format('DD/MM/YYYY')
                                                  : 'Sin Fecha de Finalizacion'}
                                              <Badge
                                                  className='ml-2'
                                                  variant='solid'
                                                  color={
                                                      contrato.estado === 'borrador'
                                                          ? 'amber'
                                                          : contrato.estado === 'activo'
                                                            ? 'emerald'
                                                            : contrato.estado === 'suspendido' ||
                                                                contrato.estado === 'finalizado'
                                                              ? 'red'
                                                              : 'zinc'
                                                  }>
                                                  {contrato.estado_label}
                                              </Badge>
                                          </div>
                                          <div className='flex flex-col'>
                                              {contrato.contrato_visitas.length > 0 ? (
                                                  contrato.contrato_visitas.map((visita, index) => (
                                                      <div
                                                          key={index}
                                                          className={classNames(
                                                              'flex justify-between py-2',
                                                              index > 0 &&
                                                                  'border border-x-0 border-b-0 border-t-black',
                                                          )}>
                                                          <div>
                                                              <div className='font-bold'>
                                                                  {visita.descripcion_visita}
                                                              </div>
                                                              <div className='text-sm font-light'>
                                                                  Frecuencia:{' '}
                                                                  {visita.frecuencia_label}
                                                              </div>
                                                          </div>
                                                          <div>
                                                              <Badge variant='solid'>
                                                                  {visita.cantidad}
                                                              </Badge>
                                                          </div>
                                                      </div>
                                                  ))
                                              ) : (
                                                  <div>Sin Visitas</div>
                                              )}
                                          </div>
                                      </div>
                                  </CardBody>
                              </Card>
                          ))
                        : 'Sin Contratos'}
                </div>
                {/* <div className="flex flex-col gap-4">
                    <div className="flex flex-row gap-4 items-center">
                        <div className="md:w-1/2">
                            <Badge>Seleccione un Contrato</Badge>
                            <SelectReact
                                name="contrato"
                                options={optionsContratos}
                                isClearable
                                onChange={async (e) => {
                                    if (e) {
                                        dispatch(detalleContratoEmpresaClienteThunk({id_contrato: (e as TSelectOption).value}))
                                    } else {
                                        dispatch(LIMPIAR_DETALLE_CONTRATO())
                                    }
                                }}
                                noOptionsMessage={(e) => (`No Existe ${e.inputValue}`)}
                                placeholder="Seleccione un Contrato"
                                value={detalleContratoEmpresaCliente && {value: detalleContratoEmpresaCliente.id.toString(), label: detalleContratoEmpresaCliente.nombre}}
                            />
                        </div>
                    </div>
                    {detalleCliente && personalizacionUsuario && detalleContratoEmpresaCliente && detalleContratoEmpresaCliente.empresa_prestadora === personalizacionUsuario.empresa && detalleContratoEmpresaCliente.empresa_cliente === detalleCliente.cliente && (
                        <div className="border border-blue-500 p-4 rounded-xl space-y-4">
                            <div>
                                <Badge className="text-xl gap-2">
                                    Servicios Y Planes
                                    <Tooltip text="Detalle Contrato">
                                        <Button variant="solid" icon="HeroEye" color="violet" onClick={() => {navigate(`/detalle-contrato-cliente/${detalleContratoEmpresaCliente.id}`)}}></Button>
                                    </Tooltip>
                                </Badge>
                            </div>
                            <div>
                                <Swiper
                                    modules={[Navigation, Pagination]}
                                    slidesPerView="auto"
                                    navigation
                                    pagination={{ clickable: true }}
                                    className="!max-w-none"
                                >
                                    {detalleContratoEmpresaCliente && detalleContratoEmpresaCliente.contrato_servicios.length > 0 ? detalleContratoEmpresaCliente.contrato_servicios.map((contServ, index) => (
                                        <SwiperSlide key={index} className="!w-full md:!w-1/2 !shrink-0 px-4">
                                            {listaContentType.some(ct => ct.model === "servicio" && ct.id === contServ.content_type) ? (
                                                <div className="border border-blue-500 h-auto rounded-xl">
                                                    <div className="flex flex-col p-4 gap-2">
                                                        <div>
                                                            <div className="text-blue-500 font-bold">Servicio: {contServ.nombre}</div>
                                                        </div>
                                                        <div className="font-bold">Categoría: <span className="font-normal"> {"categoria_label" in contServ.servicio_generico && contServ.servicio_generico.categoria_label}</span></div>
                                                        <div className="font-bold">Cantidad: <span className="font-normal"> {contServ.cantidad}</span></div>
                                                        <div className="font-bold">Precio Unitario: <span className="font-normal">${Number(contServ.precio_unitario).toLocaleString()}</span></div>
                                                    </div>
                                                    <div className="border border-b-0 border-r-0 border-l-0 border-t-black flex justify-between items-center p-4">
                                                        <div>ID Servicio: {contServ.id}</div>
                                                        <div>
                                                            <Button variant="outline">Detalles</Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="border border-emerald-500 h-auto rounded-xl">
                                                    <div className="flex flex-col p-4 gap-2">
                                                        <div>
                                                            <div className="text-emerald-500 font-bold">Plan: {contServ.nombre}</div>
                                                        </div>
                                                        <div className="font-bold">Servicios Incluidos: <span className="font-normal"> {"servicios" in contServ.servicio_generico && contServ.servicio_generico.servicios.length > 0 ? contServ.servicio_generico.servicios.map((ser, index, array) => (index + 1 === array.length ? ser.nombre : `${ser.nombre}, `)) : "Sin Servicios"}</span></div>
                                                        <div className="font-bold">Cantidad: <span className="font-normal"> {contServ.cantidad}</span></div>
                                                        <div className="font-bold">Precio Unitario: <span className="font-normal">${Number(contServ.precio_unitario).toLocaleString()}</span></div>
                                                    </div>
                                                    <div className="border border-b-0 border-r-0 border-l-0 border-t-black flex justify-between items-center p-4">
                                                        <div>ID Servicio: {contServ.id}</div>
                                                        <div>
                                                            <Button variant="outline">Detalles</Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </SwiperSlide>
                                    )) : (
                                        <SwiperSlide>Sin Servicios</SwiperSlide>
                                    )}
                                </Swiper>
                            </div>
                        </div>
                    )}
                </div> */}
            </CardBody>
        </Card>
    );
}

export default TablaDeContratosDelCliente;
