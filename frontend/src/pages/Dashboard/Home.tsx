import Container from "@/components/layouts/Container/Container"
import PageWrapper from "@/components/layouts/PageWrapper/PageWrapper"
import { useAppDispatch, useAppSelector } from "@/store"
import IndicadoresDiarios from "./components/IndicadoresDiarios"
import Subheader, { SubheaderLeft, SubheaderRight } from "@/components/layouts/Subheader/Subheader"
import EditarDashboardPreferences from "./modal/EditarDashboardPreferences"
import EmpresaSeleccionada from "./components/EmpresaSeleccionada"
import UltimasActualizacionesOc from "./components/UltimasActualizacionesOc"
import UltimosEventos from "./components/UltimosEventos"
import Badge from "@/components/ui/Badge"
import SaludoUsuario from "./components/SaludoUsuario"


function Home() {
    const { personalizacionUsuario, userMe } = useAppSelector((state) => state.auth)

    const widgetsEnabled = [
        personalizacionUsuario?.dashboard_preferences.empresa_seleccionada,
        personalizacionUsuario?.dashboard_preferences.indicadores_economicos,
        personalizacionUsuario?.dashboard_preferences.actualizaciones_oc,
        personalizacionUsuario?.dashboard_preferences.ultimos_eventos,
    ].filter(Boolean)

    const gridClasses = widgetsEnabled.length > 1 ? 'md:grid-cols-2 gap-4' : 'grid-cols-1 w-full mr-2'

    return (
        <PageWrapper isProtectedRoute={true} title="Dashboard" name="Dashboard">
            <Subheader>
                <SubheaderLeft>
                    <Badge className="text-xl">Dashboard Home</Badge>
                </SubheaderLeft>
                <SubheaderRight>
                    <EditarDashboardPreferences />
                </SubheaderRight>
            </Subheader>
            <Container className="h-full w-full">
                <SaludoUsuario />
                <div className={`grid ${gridClasses}`}>
                    {personalizacionUsuario?.dashboard_preferences.empresa_seleccionada && (
                        <div className={`w-full order-1 ${!personalizacionUsuario?.dashboard_preferences.indicadores_economicos && !personalizacionUsuario?.dashboard_preferences.actualizaciones_oc ? 'w-full' : 'md:w-full'}`}>
                            <EmpresaSeleccionada />
                        </div>
                    )}
                    {personalizacionUsuario?.dashboard_preferences.indicadores_economicos && (
                        <div className="w-full order-2 md:order-1">
                            <IndicadoresDiarios />
                        </div>
                    )}
                    {personalizacionUsuario?.dashboard_preferences.actualizaciones_oc && (
                        <div className="w-full order-3 md:order-2">
                            <UltimasActualizacionesOc />
                        </div>
                    )}
                    {/* {personalizacionUsuario?.dashboard_preferences.ultimos_eventos && (
                        <div className="w-full order-4 md:order-3">
                            <UltimosEventos/>
                        </div>
                    )} */}
                </div>
            </Container>
        </PageWrapper>
    )
}

export default Home
