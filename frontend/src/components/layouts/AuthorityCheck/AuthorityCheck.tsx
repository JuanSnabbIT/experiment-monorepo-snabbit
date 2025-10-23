import { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'
import useAuthority from '@/hooks/useAuthority'

type AuthorityGuardProps = PropsWithChildren<{
    userAuthority?: string[]
    authority?: string[]
}>

const AuthorityCheck = (props: AuthorityGuardProps) => {
    const { userAuthority = [], authority = [], children } = props

    // Si `authority` es vacío o `undefined`, la vista es sin protección
    if (!authority || authority.length === 0) {
        return <>{children}</>
    }

    const roleMatched = useAuthority(userAuthority, authority, true)

    return <>{roleMatched ? children : <Navigate to="/sin-permisos" />}</>
}

export default AuthorityCheck
