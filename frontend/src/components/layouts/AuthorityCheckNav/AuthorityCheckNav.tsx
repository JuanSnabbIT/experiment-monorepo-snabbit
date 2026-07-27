import { PropsWithChildren } from 'react';
import AuthorityGuard from '@/components/layouts/AuthorityGuard/AuthorityGuard';

type AuthorityCheckNavProps = PropsWithChildren<{
    userAuthority?: string[];
    authority?: string[];
}>;

/** Guard de menu/seccion: sin el rol requerido, no renderiza nada (no redirige). */
const AuthorityCheckNav = (props: AuthorityCheckNavProps) => <AuthorityGuard mode="hide" {...props} />;

export default AuthorityCheckNav;
