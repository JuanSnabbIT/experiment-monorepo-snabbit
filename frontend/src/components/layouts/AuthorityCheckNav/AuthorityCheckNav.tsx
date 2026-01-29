import useAuthority from '@/hooks/useAuthority';
import { PropsWithChildren } from 'react';

type AuthorityGuardProps = PropsWithChildren<{
    userAuthority?: string[];
    authority?: string[];
}>;

const AuthorityCheckNav = (props: AuthorityGuardProps) => {
    const { userAuthority = [], authority = [], children } = props;

    // Si `authority` es vacío o `undefined`, la vista es sin protección
    if (!authority || authority.length === 0) {
        return <>{children}</>;
    }

    const roleMatched = useAuthority(userAuthority, authority, true);

    return <>{roleMatched ? children : null}</>;
};

export default AuthorityCheckNav;
