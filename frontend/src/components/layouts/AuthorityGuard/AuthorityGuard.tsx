import { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import useAuthority from '@/hooks/useAuthority';

type AuthorityGuardProps = PropsWithChildren<{
    userAuthority?: string[];
    authority?: string[];
    mode: 'redirect' | 'hide';
}>;

/**
 * Motor unico de autorizacion de UI. `mode='redirect'` (rutas) navega a
 * /sin-permisos; `mode='hide'` (menu/secciones dentro de una pagina) no
 * renderiza nada. useAuthority se llama siempre, sin returns tempranos antes,
 * para no violar las Rules of Hooks si `authority` cambia entre renders.
 */
const AuthorityGuard = (props: AuthorityGuardProps) => {
    const { userAuthority = [], authority = [], mode, children } = props;

    const roleMatched = useAuthority(userAuthority, authority, true);

    if (!authority.length) {
        return <>{children}</>;
    }

    if (roleMatched) {
        return <>{children}</>;
    }

    return mode === 'redirect' ? <Navigate to="/sin-permisos" /> : null;
};

export default AuthorityGuard;
