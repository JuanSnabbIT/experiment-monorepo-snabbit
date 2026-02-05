import React from 'react';
import dayjs from 'dayjs';
import Footer, { FooterLeft, FooterRight } from '../../../components/layouts/Footer/Footer';
import { useAppSelector } from '@/store';

const DefaultFooterTemplate = () => {
    const { isAuthenticated } = useAppSelector((state) => state.auth);

    // NO renderizar el footer si el usuario no está autenticado
    if (!isAuthenticated) {
        return null;
    }

    return (
        <Footer>
            <FooterLeft className='text-zinc-500'>
                <div>Copyright © {dayjs().format('YYYY')}</div>
            </FooterLeft>
            <FooterRight className='text-zinc-500'>
                <span>
                    <b>ERP</b> Snabb-it ©
                </span>
            </FooterRight>
        </Footer>
    );
};

export default DefaultFooterTemplate;
