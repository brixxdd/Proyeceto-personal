import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Login from '../../pages/Login'

// Apollo Client mock
vi.mock('@apollo/client/react', () => ({
    useMutation: vi.fn(() => [
        vi.fn(),
        { loading: false, error: null },
    ]),
}))

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
    const actual = await import('react-router-dom')
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    }
})

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
        p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    },
    AnimatePresence: ({ children }: any) => children,
}))

// Mock lucide-react
vi.mock('lucide-react', () => ({
    Eye: () => <span data-testid="eye-icon" />,
    EyeOff: () => <span data-testid="eyeoff-icon" />,
    Flame: () => <span data-testid="flame-icon" />,
}))

describe('Login Page', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders login form with all elements', () => {
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        )

        expect(screen.getByRole('heading', { name: /bienvenido de vuelta/i })).toBeInTheDocument()
        expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument()
        expect(screen.getByText(/iniciar sesión/i)).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /regístrate gratis/i })).toBeInTheDocument()
    })

    it('shows email and password input fields with correct types', () => {
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        )

        const emailInput = screen.getByRole('textbox', { name: /email/i })
        const passwordInput = screen.getByPlaceholderText('••••••••')

        expect(emailInput).toHaveAttribute('type', 'email')
        expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('allows typing in email and password fields', async () => {
        const user = userEvent.setup()
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        )

        const emailInput = screen.getByRole('textbox', { name: /email/i })
        const passwordInput = screen.getByPlaceholderText('••••••••')

        await user.type(emailInput, 'test@fooddash.dev')
        await user.type(passwordInput, 'password123')

        expect(emailInput).toHaveValue('test@fooddash.dev')
        expect(passwordInput).toHaveValue('password123')
    })

    it('toggles password visibility', async () => {
        const user = userEvent.setup()
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        )

        const passwordInput = screen.getByPlaceholderText('••••••••')
        expect(passwordInput).toHaveAttribute('type', 'password')

        const toggleButton = screen.getByRole('button', { name: /mostrar contraseña/i })
        await user.click(toggleButton)

        expect(passwordInput).toHaveAttribute('type', 'text')
    })

    it('has proper autocomplete attributes for browser autofill', () => {
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        )

        const emailInput = screen.getByRole('textbox', { name: /email/i })
        const passwordInput = screen.getByPlaceholderText('••••••••')

        expect(emailInput).toHaveAttribute('autocomplete', 'email')
        expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
    })

    it('navigates to register page when clicking register link', () => {
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        )

        const registerLink = screen.getByRole('link', { name: /regístrate gratis/i })
        expect(registerLink).toHaveAttribute('href', '/register')
    })

    it('renders with accessible form labels', () => {
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        )

        const emailLabel = screen.getByText('Email')
        const passwordLabel = screen.getByText('Contraseña')

        expect(emailLabel).toBeInTheDocument()
        expect(passwordLabel).toBeInTheDocument()
    })

    it('submit button is not disabled when not loading', () => {
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        )

        const submitButton = screen.getByRole('button', { name: /iniciar sesión/i })
        expect(submitButton).not.toBeDisabled()
    })

    it('displays subtitle text', () => {
        render(
            <MemoryRouter>
                <Login />
            </MemoryRouter>
        )

        expect(screen.getByText('Ingresa a tu cuenta para continuar')).toBeInTheDocument()
    })
})
