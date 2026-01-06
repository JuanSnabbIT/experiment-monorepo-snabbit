import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store'
import { detalleOrdenTrabajoThunk } from '@/store/slices/ordenTrabajo/ordenTrabajoSlice'
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper'
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader'
import Container from '@/components/layouts/Container/Container'
import Card, { CardBody, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import dayjs from 'dayjs'

const CierreOTDetalle = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const { detalleOrdenTrabajo } = useAppSelector((state) => state.ordenTrabajo)
    const [datosPactado, setDatosPactado] = useState<{
        items: any[]
        total: number
    }>({
        items: [],
        total: 0
    })
    const [datosEjecutado, setDatosEjecutado] = useState<{
        items: any[]
        total: number
    }>({
        items: [],
        total: 0
    })

    useEffect(() => {
        if (id) {
            dispatch(detalleOrdenTrabajoThunk({ id_ordenTrabajo: parseInt(id) }))
        }
    }, [dispatch, id])

    useEffect(() => {
        if (detalleOrdenTrabajo) {
            // DATOS EJECUTADO: Por ahora vacío (datos vendrían del detalle completo)
            // En la implementación completa, aquí se mostrarían servicios, compras, rendiciones
            const itemsEjecutados: any[] = []
            const totalEjecutado = 0
            
            setDatosEjecutado({
                items: itemsEjecutados,
                total: totalEjecutado
            })

            // DATOS PACTADO: Por ahora vacío (será cuando agreguemos cotizaciones)
            setDatosPactado({
                items: [],
                total: 0
            })
        }
    }, [detalleOrdenTrabajo])

    if (!detalleOrdenTrabajo) {
        return (
            <PageWrapper name="Facturación">
                <Container>
                    <div className="text-center py-10">
                        <p className="text-gray-500">Cargando...</p>
                    </div>
                </Container>
            </PageWrapper>
        )
    }

    return (
        <PageWrapper name={`Facturación - OT #${detalleOrdenTrabajo.id}`}>
            <Subheader>
                <SubheaderLeft>
                    <div>
                        <h2 className="text-xl font-bold">
                            OT #{detalleOrdenTrabajo.id} - {detalleOrdenTrabajo.cliente_nombre}
                        </h2>
                        <p className="text-sm text-gray-500">
                            Finalizada: {dayjs(detalleOrdenTrabajo.fecha_finalizacion_ot).format('DD/MM/YYYY')}
                        </p>
                    </div>
                </SubheaderLeft>
                <SubheaderRight>
                    <div></div>
                </SubheaderRight>
            </Subheader>

            <Container className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* COLUMNA IZQUIERDA: DATOS PACTADO */}
                <div className="flex flex-col gap-4">
                    <Card>
                        <CardBody>
                            <CardTitle>
                                <h3 className="text-lg font-bold text-blue-600">Datos Pactado</h3>
                            </CardTitle>
                            
                            <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                                <p className="text-gray-500 text-sm">
                                    Aquí se mostrarán las cotizaciones asociadas
                                </p>
                                <Button 
                                    className="mt-4"
                                    color="blue"
                                    variant="solid"
                                >
                                    Agregar Cotización
                                </Button>
                            </div>

                            {datosPactado.items.length > 0 && (
                                <div className="mt-4">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="text-left p-2">Concepto</th>
                                                <th className="text-right p-2">Monto</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {datosPactado.items.map((item: any, idx: number) => (
                                                <tr key={idx} className="border-b">
                                                    <td className="p-2">{item.nombre}</td>
                                                    <td className="text-right p-2">
                                                        ${item.monto?.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="mt-4 p-4 bg-blue-50 rounded-lg flex justify-between font-bold">
                                        <span>Total Pactado:</span>
                                        <span className="text-blue-600">${datosPactado.total.toLocaleString()}</span>
                                    </div>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>

                {/* COLUMNA DERECHA: DATOS EJECUTADO */}
                <div className="flex flex-col gap-4">
                    <Card>
                        <CardBody>
                            <CardTitle>
                                <h3 className="text-lg font-bold text-green-600">Datos Ejecutado</h3>
                            </CardTitle>
                            
                            {datosEjecutado.items.length > 0 ? (
                                <div className="mt-4">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="text-left p-2">Servicio</th>
                                                <th className="text-right p-2">Monto</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {datosEjecutado.items.map((item: any, idx: number) => (
                                                <tr key={idx} className="border-b">
                                                    <td className="p-2">{item.nombre || item.detalle}</td>
                                                    <td className="text-right p-2">
                                                        ${(item.monto_total || 0).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="mt-4 p-4 bg-green-50 rounded-lg flex justify-between font-bold">
                                        <span>Total Ejecutado:</span>
                                        <span className="text-green-600">${datosEjecutado.total.toLocaleString()}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                                    <p className="text-gray-500 text-sm">
                                        No hay servicios registrados en esta OT
                                    </p>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </Container>

            {/* RESUMEN COMPARATIVO */}
            <Container className="mt-4">
                <Card>
                    <CardBody>
                        <CardTitle>
                            <h3 className="text-lg font-bold">Comparativa</h3>
                        </CardTitle>
                        <div className="mt-4 grid grid-cols-3 gap-4">
                            <div className="p-4 bg-blue-50 rounded-lg text-center">
                                <p className="text-sm text-gray-600">Total Pactado</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    ${datosPactado.total.toLocaleString()}
                                </p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-lg text-center">
                                <p className="text-sm text-gray-600">Total Ejecutado</p>
                                <p className="text-2xl font-bold text-green-600">
                                    ${datosEjecutado.total.toLocaleString()}
                                </p>
                            </div>
                            <div className={`p-4 rounded-lg text-center ${
                                datosPactado.total >= datosEjecutado.total ? 'bg-emerald-50' : 'bg-red-50'
                            }`}>
                                <p className="text-sm text-gray-600">Diferencia</p>
                                <p className={`text-2xl font-bold ${
                                    datosPactado.total >= datosEjecutado.total ? 'text-emerald-600' : 'text-red-600'
                                }`}>
                                    ${Math.abs(datosPactado.total - datosEjecutado.total).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </Container>
        </PageWrapper>
    )
}

export default CierreOTDetalle
