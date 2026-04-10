import { useAppSelector } from '@/store';
import { Component, ErrorInfo, ReactNode, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import contentRoutes from '../../routes/contentRoutes';
import AuthorityCheck from '../layouts/AuthorityCheck/AuthorityCheck';
import Container from '../layouts/Container/Container';
import Header, { HeaderLeft, HeaderRight } from '../layouts/Header/Header';
import PageWrapper from '../layouts/PageWrapper/PageWrapper';
import Subheader, { SubheaderLeft, SubheaderRight } from '../layouts/Subheader/Subheader';
import Card from '../ui/Card';

interface IErrorBoundaryState {
    hasError: boolean;
    errorMessage: string;
}

class RouteErrorBoundary extends Component<{ children: ReactNode }, IErrorBoundaryState> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false, errorMessage: '' };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, errorMessage: error?.message ?? String(error) };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[RouteErrorBoundary] Error capturado:', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className='flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8'>
                    <div className='rounded-lg border border-red-500 bg-red-500/10 p-6 text-center'>
                        <h2 className='mb-2 text-lg font-bold text-red-500'>Error en la página</h2>
                        <p className='mb-4 font-mono text-sm text-red-400'>{this.state.errorMessage}</p>
                        <button
                            onClick={() => this.setState({ hasError: false, errorMessage: '' })}
                            className='rounded bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600'>
                            Reintentar
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const ContentRouter = () => {
    const { listaGrupos, isAuthenticated } = useAppSelector((state) => state.auth);

    // Fallback condicional: solo mostrar skeleton si está autenticado
    const suspenseFallback = isAuthenticated ? (
        <>
            <Header>
                <HeaderLeft>
                    <div className='h-10 w-40 animate-pulse rounded-full bg-zinc-800/25 dark:bg-zinc-200/25' />
                </HeaderLeft>
                <HeaderRight>
                    <div className='flex gap-4'>
                        <div className='h-10 w-10 animate-pulse rounded-full bg-zinc-800/25 dark:bg-zinc-200/25' />
                        <div className='h-10 w-10 animate-pulse rounded-full bg-zinc-800/25 dark:bg-zinc-200/25' />
                        <div className='h-10 w-10 animate-pulse rounded-full bg-zinc-800/25 dark:bg-zinc-200/25' />
                    </div>
                </HeaderRight>
            </Header>
            <PageWrapper isProtectedRoute={false}>
                <Subheader>
                    <SubheaderLeft>
                        <div className='h-10 w-40 animate-pulse rounded-full bg-zinc-800/25 dark:bg-zinc-200/25' />
                    </SubheaderLeft>
                    <SubheaderRight>
                        <div className='h-10 w-40 animate-pulse rounded-full bg-zinc-800/25 dark:bg-zinc-200/25' />
                    </SubheaderRight>
                </Subheader>
                <Container>
                    <div className='grid grid-cols-12 gap-4'>
                        <div className='col-span-3'>
                            <Card className='h-[15vh] animate-pulse'>
                                <div className='invisible'>Loading...</div>
                            </Card>
                        </div>
                        <div className='col-span-3'>
                            <Card className='h-[15vh] animate-pulse'>
                                <div className='invisible'>Loading...</div>
                            </Card>
                        </div>
                        <div className='col-span-3'>
                            <Card className='h-[15vh] animate-pulse'>
                                <div className='invisible'>Loading...</div>
                            </Card>
                        </div>
                        <div className='col-span-3'>
                            <Card className='h-[15vh] animate-pulse'>
                                <div className='invisible'>Loading...</div>
                            </Card>
                        </div>
                        <div className='col-span-6'>
                            <Card className='h-[50vh] animate-pulse'>
                                <div className='invisible'>Loading...</div>
                            </Card>
                        </div>
                        <div className='col-span-6'>
                            <Card className='h-[50vh] animate-pulse'>
                                <div className='invisible'>Loading...</div>
                            </Card>
                        </div>
                        <div className='col-span-12'>
                            <Card className='h-[15vh] animate-pulse'>
                                <div className='invisible'>Loading...</div>
                            </Card>
                        </div>
                    </div>
                </Container>
            </PageWrapper>
        </>
    ) : null;

    return (
        <RouteErrorBoundary>
            <Suspense fallback={suspenseFallback}>
                <Routes>
                    {contentRoutes.map((routeProps) => (
                        <Route
                            key={routeProps.path}
                            path={routeProps.path}
                            element={
                                <AuthorityCheck
                                    userAuthority={listaGrupos?.grupos}
                                    authority={routeProps.authority}
                                    children={routeProps.element}
                                />
                            }
                        />
                    ))}
                    <Route path='*' element={<Navigate to='/404' replace />} />
                </Routes>
            </Suspense>
        </RouteErrorBoundary>
    );
};

export default ContentRouter;
