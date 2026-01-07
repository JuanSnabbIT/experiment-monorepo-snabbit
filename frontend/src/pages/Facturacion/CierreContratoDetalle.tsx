import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper'
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader'
import Container from '@/components/layouts/Container/Container'
import Card, { CardBody, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ApiService from '@/services/ApiService'
import dayjs from 'dayjs'

interface ICierreContrato {
  id: number
  contrato: number | null
  contrato_nombre?: string | null
  cliente_nombre?: string | null
  periodo_desde?: string | null
  periodo_hasta?: string | null
  resultado?: any
}

const CierreContratoDetalle = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [cierre, setCierre] = useState<ICierreContrato | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  useEffect(() => {
    const fetchCierre = async () => {
      if (!id) return
      setLoading(true)
      try {
        const response = await ApiService.fetchData({
          url: `/api/cierres-facturacion/${id}/`,
          method: 'get',
        })
        setCierre(response.data as ICierreContrato)
      } catch (error) {
        setCierre(null)
      } finally {
        setLoading(false)
      }
    }

    fetchCierre()
  }, [id])

  const { totalPactado, totalEjecutado, diferencia } = useMemo(() => {
    const pactadoTotal = Number(cierre?.resultado?.pactado?.total ?? 0)
    const ejecutadoTotal = Number(cierre?.resultado?.ejecutado?.total ?? 0)
    return {
      totalPactado: pactadoTotal,
      totalEjecutado: ejecutadoTotal,
      diferencia: pactadoTotal - ejecutadoTotal,
    }
  }, [cierre])

  if (loading || !cierre) {
    return (
      <PageWrapper name="Facturación">
        <Container>
          <div className="text-center py-10 text-gray-500">Cargando facturación...</div>
        </Container>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper name={`Facturación - Contrato #${cierre.contrato ?? ''}`}>
      <Subheader>
        <SubheaderLeft>
          <div>
            <h2 className="text-xl font-bold">
              Contrato #{cierre.contrato ?? ''}
              {cierre.contrato_nombre ? ` - ${cierre.contrato_nombre}` : ''}
            </h2>
            <p className="text-sm text-gray-500">
              Cliente: {cierre.cliente_nombre || 'N/D'}
            </p>
            <p className="text-sm text-gray-500">
              Período: {cierre.periodo_desde ? dayjs(cierre.periodo_desde).format('DD/MM/YYYY') : 'Sin inicio'}
              {' '} - {cierre.periodo_hasta ? dayjs(cierre.periodo_hasta).format('DD/MM/YYYY') : 'Sin fin'}
            </p>
          </div>
        </SubheaderLeft>
        <SubheaderRight>
          <Button icon="HeroArrowLeft" variant="outline" onClick={() => navigate(-1)}>
            Volver
          </Button>
        </SubheaderRight>
      </Subheader>

      <Container className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* DATOS PACTADO */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardBody>
              <CardTitle>
                <h3 className="text-lg font-bold text-blue-600">Datos Pactado</h3>
              </CardTitle>

              {Array.isArray(cierre?.resultado?.pactado?.items) && cierre.resultado.pactado.items.length > 0 ? (
                <div className="mt-4">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b border-gray-300">
                      <tr>
                        <th className="text-left p-2 font-semibold">Servicio / Licencia</th>
                        <th className="text-right p-2 font-semibold">Cant.</th>
                        <th className="text-right p-2 font-semibold">Precio Unit.</th>
                        <th className="text-right p-2 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cierre.resultado.pactado.items.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="p-2 text-gray-800">
                            <span className="font-medium">{item.nombre}</span>
                            <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded">
                              {item.tipo === 'servicio' ? 'Servicio' : 'Licencia'}
                            </span>
                          </td>
                          <td className="text-right p-2">{item.cantidad}</td>
                          <td className="text-right p-2">${Number(item.precio_unitario).toLocaleString('es-CL')}</td>
                          <td className="text-right p-2 font-semibold text-blue-600">
                            ${Number(item.total).toLocaleString('es-CL')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg flex justify-between font-bold">
                    <span>Total Pactado:</span>
                    <span className="text-blue-600">${totalPactado.toLocaleString('es-CL')}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                  <p className="text-gray-500 text-sm">Sin servicios contratados para este período</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* DATOS EJECUTADO */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardBody>
              <CardTitle>
                <h3 className="text-lg font-bold text-green-600">Datos Ejecutado</h3>
              </CardTitle>

              {Array.isArray(cierre?.resultado?.ejecutado?.items) && cierre.resultado.ejecutado.items.length > 0 ? (
                <div className="mt-4">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b border-gray-300">
                      <tr>
                        <th className="text-left p-2 font-semibold">Concepto</th>
                        <th className="text-right p-2 font-semibold">Cant.</th>
                        <th className="text-right p-2 font-semibold">Precio Unit.</th>
                        <th className="text-right p-2 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cierre.resultado.ejecutado.items.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="p-2 text-gray-800">
                            <span className="font-medium">{item.nombre || item.detalle || 'Servicio'}</span>
                          </td>
                          <td className="text-right p-2">{item.cantidad || '-'}</td>
                          <td className="text-right p-2">${Number(item.precio_unitario || 0).toLocaleString('es-CL')}</td>
                          <td className="text-right p-2 font-semibold text-green-600">
                            ${Number(item.total || item.monto_total || 0).toLocaleString('es-CL')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 p-4 bg-green-50 rounded-lg flex justify-between font-bold">
                    <span>Total Ejecutado:</span>
                    <span className="text-green-600">${totalEjecutado.toLocaleString('es-CL')}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                  <p className="text-gray-500 text-sm">No hay servicios registrados en este período</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </Container>

      {/* COMPARATIVA */}
      <Container className="mt-4">
        <Card>
          <CardBody>
            <CardTitle>
              <h3 className="text-lg font-bold">Comparativa</h3>
            </CardTitle>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <p className="text-sm text-gray-600">Total Pactado</p>
                <p className="text-2xl font-bold text-blue-600">${totalPactado.toLocaleString('es-CL')}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <p className="text-sm text-gray-600">Total Ejecutado</p>
                <p className="text-2xl font-bold text-green-600">${totalEjecutado.toLocaleString('es-CL')}</p>
              </div>
              <div className={`p-4 rounded-lg text-center ${diferencia >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <p className="text-sm text-gray-600">Diferencia</p>
                <p className={`text-2xl font-bold ${diferencia >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  ${Math.abs(diferencia).toLocaleString('es-CL')}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </Container>
    </PageWrapper>
  )
}

export default CierreContratoDetalle
