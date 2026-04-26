import { Navigate, useLocation } from 'react-router-dom'

interface RoleRouteProps {
    children: React.ReactNode
    /** Comma-separated roles allowed to access this route */
    allowedRoles: string
    /** Where to redirect if role is not allowed (default: /) */
    redirectTo?: string
}

/**
 * Role guard — redirects if user role is not in allowedRoles list.
 * Must be used inside a ProtectedRoute (or after auth check).
 */
export default function RoleRoute({
    children,
    allowedRoles,
    redirectTo = '/',
}: RoleRouteProps) {
    const role = sessionStorage.getItem('user_role')
    const location = useLocation()
    const allowed = allowedRoles.split(',').map(r => r.trim())

    if (!role || !allowed.includes(role)) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />
    }

    return <>{children}</>
}
