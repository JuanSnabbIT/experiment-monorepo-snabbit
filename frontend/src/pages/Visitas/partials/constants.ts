import EntregaEquipo from "../components/EntregaEquipo";
import ListaAsistenciaUsuario from "../components/ListaAsistenciaUsuario";
// import ListaInsumosVisita from "../components/ListaInsumosVisita";

const COMPONENT_TYPES = {
    TYPE1: { text: 'Asistencia Usuarios', component: ListaAsistenciaUsuario },
    TYPE2: { text: 'Entrega de Equipos', component: EntregaEquipo},
    // TYPE3: { text: 'Insumos', component: ListaInsumosVisita}


};

export type TComponentType = typeof COMPONENT_TYPES[keyof typeof COMPONENT_TYPES];
export default COMPONENT_TYPES;