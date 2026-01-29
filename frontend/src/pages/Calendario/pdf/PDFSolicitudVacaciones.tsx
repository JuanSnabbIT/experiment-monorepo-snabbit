import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import { useAppDispatch, useAppSelector } from '@/store';
import { detalleSolicitudVacacionesThunk } from '@/store/slices/calendario/calendarioSlice';
import { Page, Text, View, Document, StyleSheet, PDFViewer, Image } from '@react-pdf/renderer';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

function PDFSolicitudVacaciones() {
    const dispatch = useAppDispatch();
    const { id } = useParams();
    const { detalleSolicitudVacaciones } = useAppSelector((state) => state.calendario);
    useEffect(() => {
        dispatch(detalleSolicitudVacacionesThunk({ id_solicitud: id }));
    }, [id]);

    return (
        <PageWrapper
            isProtectedRoute={true}
            title='Solicitud de vacaciones'
            name='Solicitud de vacaciones'>
            <PDFViewer className='h-full w-full'>
                <Document
                    title={`PV_${detalleSolicitudVacaciones?.papeleta.nombre_empleado.replace(' ', '_')}_${dayjs(detalleSolicitudVacaciones?.fecha_solicitud).format('DD-MM-YYYY')}`}>
                    <Page size='LETTER' style={styles.page}>
                        <View style={styles.header}>
                            {detalleSolicitudVacaciones &&
                                detalleSolicitudVacaciones.logo_empresa && (
                                    <Image
                                        style={styles.logo}
                                        src={detalleSolicitudVacaciones.logo_empresa}
                                    />
                                )}
                            <Text style={styles.headerText}>Solicitud de Vacaciones</Text>
                        </View>
                        <View style={styles.section}>
                            <Text style={styles.subHeader}>Detalles del Empleado</Text>
                            <View style={styles.row}>
                                <View style={styles.fullWidth}>
                                    <Text style={styles.text}>
                                        Trabajador:{' '}
                                        {detalleSolicitudVacaciones?.papeleta.nombre_empleado}
                                    </Text>
                                    <Text style={styles.text}>
                                        Run: {detalleSolicitudVacaciones?.papeleta.rut}
                                    </Text>
                                </View>
                                <View style={styles.halfWidth}>
                                    <Text style={styles.text}>
                                        Años de Servicio:{' '}
                                        {detalleSolicitudVacaciones?.papeleta.años_servicio.toFixed(
                                            0,
                                        )}{' '}
                                        Año(s)
                                    </Text>
                                    <Text style={styles.text}>
                                        Días Ganados:{' '}
                                        {detalleSolicitudVacaciones?.papeleta.dias_acumulados}{' '}
                                        Dia(s)
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.section}>
                            <Text style={styles.subHeader}>Detalles de la Solicitud</Text>
                            <View style={styles.row}>
                                <View style={styles.halfWidth}>
                                    <Text style={styles.text}>
                                        Fecha de Inicio Periodo:{' '}
                                        {dayjs(detalleSolicitudVacaciones?.fecha_inicio).format(
                                            'DD-MM-YYYY',
                                        )}
                                    </Text>
                                    <Text style={styles.text}>
                                        Días Disponibles:{' '}
                                        {detalleSolicitudVacaciones?.papeleta.dias_disponibles}{' '}
                                        Dia(s)
                                    </Text>
                                    <Text style={styles.text}>
                                        Estado: {detalleSolicitudVacaciones?.estado_label}
                                    </Text>
                                </View>
                                <View style={styles.halfWidth}>
                                    <Text style={styles.text}>
                                        Fecha de Fin Periodo:{' '}
                                        {dayjs(detalleSolicitudVacaciones?.fecha_fin).format(
                                            'DD-MM-YYYY',
                                        )}
                                    </Text>
                                    <Text style={styles.text}>
                                        Días Tomados:{' '}
                                        {detalleSolicitudVacaciones?.papeleta.dias_tomados} Dia(s)
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.section}>
                            <Text style={styles.subHeader}>Comentarios</Text>
                            <Text style={styles.text}>
                                Comentario: {detalleSolicitudVacaciones?.comentario}
                            </Text>
                        </View>
                        <View style={styles.section}>
                            <Text style={styles.subHeader}>Información Adicional</Text>
                            <View style={styles.row}>
                                <View style={styles.halfWidth}>
                                    <Text style={styles.text}>
                                        Fecha de Solicitud:{' '}
                                        {new Date(
                                            detalleSolicitudVacaciones?.fecha_solicitud || '',
                                        ).toLocaleDateString('es-ES')}
                                    </Text>
                                    <Text style={styles.text}>
                                        Creado por: {detalleSolicitudVacaciones?.nombre_creado_por}
                                    </Text>
                                </View>
                                <View style={styles.halfWidth}>
                                    <Text style={styles.text}>
                                        Aprobado por:{' '}
                                        {detalleSolicitudVacaciones?.nombre_aprobado_rechazado_por}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.section}>
                            <Text style={styles.subHeader}>Firmas</Text>
                            <View style={styles.row}>
                                <View style={styles.halfWidth}>
                                    <Text style={styles.text}>Firma del Empresa:</Text>
                                    {detalleSolicitudVacaciones &&
                                        detalleSolicitudVacaciones.firma_empresa && (
                                            <Image
                                                style={styles.image}
                                                src={detalleSolicitudVacaciones.firma_empresa}
                                            />
                                        )}
                                    <Text style={styles.text}>
                                        Aprobado por:{' '}
                                        {detalleSolicitudVacaciones?.nombre_aprobado_rechazado_por}
                                    </Text>
                                </View>
                                <View style={styles.halfWidth}>
                                    <Text style={styles.text}>Firma del Solicitante:</Text>
                                    {detalleSolicitudVacaciones &&
                                        detalleSolicitudVacaciones.firma_usuario && (
                                            <Image
                                                style={styles.image}
                                                src={detalleSolicitudVacaciones.firma_usuario}
                                            />
                                        )}
                                    <Text style={styles.text}>
                                        Nombre:
                                        {detalleSolicitudVacaciones?.papeleta.nombre_empleado}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </Page>
                </Document>
            </PDFViewer>
        </PageWrapper>
    );
}

export default PDFSolicitudVacaciones;

const styles = StyleSheet.create({
    image: {
        width: 70,
        height: 70,
        marginVertical: 10,
        alignSelf: 'center',
    },
    page: {
        padding: 30,
        // backgroundColor: '#f8f9fa'
    },
    section: {
        margin: 5,
        padding: 6,
        border: '1px solid #dee2e6',
        borderRadius: 5,
        // backgroundColor: '#ffffff',
        // boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
    },
    header: {
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 0,
    },
    headerText: {
        fontSize: 16,
        // color: '#343a40',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    logo: {
        width: 70,
        height: 70,
        marginVertical: 0,
        alignSelf: 'center',
    },
    subHeader: {
        fontSize: 12,
        marginBottom: 10,
        // color: '#495057',
        fontWeight: 'bold',
        borderBottom: '1px solid #dee2e6',
        paddingBottom: 5,
    },
    text: {
        fontSize: 12,
        // color: '#212529',
        marginBottom: 5,
        lineHeight: 1.5,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    fullWidth: {
        width: '100%',
    },
    halfWidth: {
        width: '48%',
    },
});
