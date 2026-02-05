import React from 'react';
import { NavItem, NavSeparator } from '../../../components/layouts/Navigation/Nav';
import { authPages } from '../../../config/pages.config';
import User from '../../../components/layouts/User/User';
import { useAppDispatch, useAppSelector } from '@/store';
import { LOGOUT } from '@/store/slices/auth/authSlice';

const UserTemplate = () => {
    const dispatch = useAppDispatch();
    const {
        userMe: userData,
        loading: isLoading,
    } = useAppSelector((state) => state.auth);

    // Obtener nombre completo del usuario
    const getFullName = () => {
        const firstName = userData?.first_name || '';
        const lastName = userData?.last_name || '';
        return `${firstName} ${lastName}`.trim() || 'Usuario';
    };

    return (
        <User
            isLoading={isLoading}
            name={getFullName()}
            position={userData?.email || ''}
            src={userData?.image ? userData.image : ''}>
            <NavSeparator />
            <NavItem {...authPages.profilePage} />
            <NavItem
                text='Cerrar sesión'
                icon='HeroArrowRightOnRectangle'
                onClick={() => {
                    dispatch(LOGOUT());
                }}
            />
        </User>
    );
};

export default UserTemplate;
