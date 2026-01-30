import React, { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import contentRoutes from '../../routes/contentRoutes';
import PageWrapper from '../layouts/PageWrapper/PageWrapper';
import Container from '../layouts/Container/Container';
import Subheader, { SubheaderLeft, SubheaderRight } from '../layouts/Subheader/Subheader';
import Header, { HeaderLeft, HeaderRight } from '../layouts/Header/Header';
import Card from '../ui/Card';
import AuthorityCheck from '../layouts/AuthorityCheck/AuthorityCheck';
import { useAppSelector } from '@/store';

const ContentRouter = () => {
    const { listaGrupos } = useAppSelector((state) => state.auth);

    return (
        <Suspense
            fallback={
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
            }>
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
    );
};

export default ContentRouter;
