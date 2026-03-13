import Container from '@/components/layouts/Container/Container';
import PageWrapper from '@/components/layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '@/components/layouts/Subheader/Subheader';
import Button from '@/components/ui/Button';
import { useGetDetalleContratoQuery } from '@/store/slices/contratos/contratoApi';
import 'dayjs/locale/es';
import { useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import PDFContratoLicencias from './PDFContratoLicencias';
import PDFContratoServicios from './PDFContratoServicios';
import PDFContratoVenta from './PDFContratoVenta';

// Componente Header que se repetirá en todas las páginas gracias al "fixed"
// const Header = () => (
//     <View style={styles.header} fixed>
//         <Text style={{color: "#808080", fontSize: 15, alignSelf: "center"}}>{dayjs().locale('es').format("DD [de] MMMM [del] YYYY")}</Text>
//         <View style={{width: '50%', height: '100%'}}>
//             <Image
//                 style={{ width: '100%', height: '100%' }}
//                 src={Image1}
//             />
//         </View>
//     </View>
// );

function PDFContrato() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { data: detalleContratoEmpresaCliente } = useGetDetalleContratoQuery(id!, { skip: !id });
    const componentRef = useRef<HTMLDivElement>(null);
    const reactToPrintFn = useReactToPrint({ contentRef: componentRef });

    return (
        <PageWrapper
            isProtectedRoute={false}
            name='Contratos del Cliente'
            title='Contratos del Cliente'>
            <Subheader>
                <SubheaderLeft>
                    <div className='flex w-full gap-4'>
                        <Button
                            icon='HeroArrowSmallLeft'
                            onClick={() => {
                                navigate(-1);
                            }}
                        />
                    </div>
                </SubheaderLeft>
                <SubheaderRight>
                    <Button
                        icon='HeroPrinter'
                        onClick={() => {
                            // if (componentRef.current) {
                            //     const printContents = componentRef.current.innerHTML;
                            //     const printWindow = window.open('', '', 'height=600,width=800');
                            //     if (printWindow) {
                            //         printWindow.document.write(`
                            //             <html>
                            //                 <head>
                            //                     <title>Imprimir Componente</title>
                            //                     <link rel="stylesheet" type="text/css" href="/styles/index.css">
                            //                     <link rel="stylesheet" type="text/css" href="/styles/vendors.css">
                            //                 </head>
                            //                 <body>
                            //                     ${printContents}
                            //                 </body>
                            //             </html>
                            //         `);
                            //         printWindow.document.close(); // Finaliza la escritura del documento.
                            //         printWindow.focus(); // Fija el foco en la nueva ventana.
                            //         printWindow.print(); // Llama a la función de impresión.
                            //         printWindow.close(); // Cierra la ventana de impresión tras ejecutarla.
                            //     }
                            // }
                            reactToPrintFn();
                        }}></Button>
                </SubheaderRight>
            </Subheader>
            <Container className='h-full w-full md:max-w-[800px]'>
                {detalleContratoEmpresaCliente ? (
                    <>
                        {detalleContratoEmpresaCliente.tipo === 'servicios' && (
                            <PDFContratoServicios
                                contrato={detalleContratoEmpresaCliente}
                                componentRef={componentRef}
                            />
                        )}
                        {detalleContratoEmpresaCliente.tipo === 'licencia' && (
                            <PDFContratoLicencias
                                contrato={detalleContratoEmpresaCliente}
                                componentRef={componentRef}
                            />
                        )}
                        {detalleContratoEmpresaCliente.tipo === 'venta' && (
                            <PDFContratoVenta
                                contrato={detalleContratoEmpresaCliente}
                                componentRef={componentRef}
                            />
                        )}
                    </>
                ) : (
                    <div>Sin Contrato</div>
                )}
                {/* <PDFViewer className="w-full h-full">
                    <Document language="es">
                        <Page size="LEGAL" style={styles.page}>
                            <Header />
                            <View style={styles.content}>
                                <Text style={styles.title}>CONTRATO DE SERVICIOS TECNOLOGICOS Y ASESORIAS</Text>
                            </View>
                        </Page>
                    </Document>
                </PDFViewer> */}
            </Container>
        </PageWrapper>
    );
}

export default PDFContrato;

// // Definición de estilos
// const styles = StyleSheet.create({
//     page: {
//         padding: 40,
//         fontFamily: 'Helvetica',
//         fontSize: 10,
//     },
//     // Header: se posiciona absolutamente y con "fixed", se repite en cada página generada.
//     header: {
//         display: "flex",
//         justifyContent: "space-between",
//         flexDirection: "row",
//         width: "100%",
//         height: 50,
//     },
//     // Contenido principal, se deja un margen superior para evitar superposición con el header.
//     content: {
//         marginTop: 5,
//     },
//     // Estilos para el contenido del contrato (adaptalos según el documento original)
//     paragraph: {
//         marginBottom: 10,
//         textAlign: 'justify',
//         lineHeight: 1.3,
//     },
//     title: {
//         fontSize: 14,
//         marginBottom: 10,
//         textAlign: 'center',
//         fontWeight: 'bold',
//     },
// });
