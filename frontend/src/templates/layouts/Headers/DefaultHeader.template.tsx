import Header, { HeaderLeft, HeaderRight } from '../../../components/layouts/Header/Header';
import AutoBreadcrumb from '../../../components/layouts/Breadcrumb/AutoBreadcrumb';
import DefaultHeaderRightCommon from './_common/DefaultHeaderRight.common';
import { useAppSelector } from '@/store';

const DefaultHeaderTemplate = () => {
    const { isAuthenticated } = useAppSelector((state) => state.auth);

    // NO renderizar el header si el usuario no está autenticado
    if (!isAuthenticated) {
        return null;
    }

    return (
        <Header>
            <HeaderLeft>
                <AutoBreadcrumb />
            </HeaderLeft>
            <HeaderRight>
                <DefaultHeaderRightCommon />
            </HeaderRight>
        </Header>
    );
};

export default DefaultHeaderTemplate;
