import { PropsWithChildren } from 'react';
import AuthorityGuard from '@/components/layouts/AuthorityGuard/AuthorityGuard';

type AuthorityCheckProps = PropsWithChildren<{
    userAuthority?: string[];
    authority?: string[];
}>;

/** Guard de ruta: sin el rol requerido, redirige a /sin-permisos. */
const AuthorityCheck = (props: AuthorityCheckProps) => <AuthorityGuard mode="redirect" {...props} />;

export default AuthorityCheck;
