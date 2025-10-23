import Container from "@/components/layouts/Container/Container"
import PageWrapper from "@/components/layouts/PageWrapper/PageWrapper"


function SinPermisos() {
    return (
        <PageWrapper isProtectedRoute={true} title="Sin Permisos">
            <Container className='flex h-full items-center justify-center'>
                <div className="text-9xl">SIN PERMISOS</div>
            </Container>
        </PageWrapper>
    )
}

export default SinPermisos