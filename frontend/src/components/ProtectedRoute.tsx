import { Navigate, useLocation } from 'react-router-dom'

interface ProtectedRouteProps {
    children: React.ReactNode
    /** Redirect to this path if not authenticated (default: /login) */
    redirectTo?: string
}

/**
 * Route guard — redirects to /login if user has no auth token.
 * Preserves the attempted URL so we can redirect back after login.
 */
export default function ProtectedRoute({
    children,
    redirectTo = '/login',
}: ProtectedRouteProps) {
    const token = sessionStorage.getItem('token')
    const location = useLocation()

    if (!token) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />
    }

    return <>{children}</>
}
