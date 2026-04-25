import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Register from '../../pages/Register'

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

describe('Register Page', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders registration form with all elements', () => {
        render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>
        )

        expect(screen.getByRole('heading', { name: /crear cuenta/i })).toBeInTheDocument()
        expect(screen.getByRole('textbox', { name: /nombre completo/i })).toBeInTheDocument()
        expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Mínimo 8 caracteres')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /crear cuenta gratis/i })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /inicia sesión/i })).toBeInTheDocument()
    })

    it('shows all input fields with correct types', () => {
        render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>
        )

        const nameInput = screen.getByRole('textbox', { name: /nombre completo/i })
        const emailInput = screen.getByRole('textbox', { name: /email/i })
        const passwordInput = screen.getByPlaceholderText('Mínimo 8 caracteres')

        expect(nameInput).toHaveAttribute('type', 'text')
        expect(nameInput).toHaveAttribute('autocomplete', 'name')
        expect(emailInput).toHaveAttribute('type', 'email')
        expect(emailInput).toHaveAttribute('autocomplete', 'email')
        expect(passwordInput).toHaveAttribute('type', 'password')
        expect(passwordInput).toHaveAttribute('autocomplete', 'new-password')
    })

    it('allows typing in all fields', async () => {
        const user = userEvent.setup()
        render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>
        )

        const nameInput = screen.getByRole('textbox', { name: /nombre completo/i })
        const emailInput = screen.getByRole('textbox', { name: /email/i })
        const passwordInput = screen.getByPlaceholderText('Mínimo 8 caracteres')

        await user.type(nameInput, 'Juan Pérez')
        await user.type(emailInput, 'juan@fooddash.dev')
        await user.type(passwordInput, 'password123')

        expect(nameInput).toHaveValue('Juan Pérez')
        expect(emailInput).toHaveValue('juan@fooddash.dev')
        expect(passwordInput).toHaveValue('password123')
    })

    it('toggles password visibility', async () => {
        const user = userEvent.setup()
        render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>
        )

        const passwordInput = screen.getByPlaceholderText('Mínimo 8 caracteres')
        expect(passwordInput).toHaveAttribute('type', 'password')

        const toggleButton = screen.getByRole('button', { name: /mostrar contraseña/i })
        await user.click(toggleButton)

        expect(passwordInput).toHaveAttribute('type', 'text')
    })

    it('navigates to login page when clicking login link', () => {
        render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>
        )

        const loginLink = screen.getByRole('link', { name: /inicia sesión/i })
        expect(loginLink).toHaveAttribute('href', '/login')
    })

    it('submit button is not disabled when not loading', () => {
        render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>
        )

        const submitButton = screen.getByRole('button', { name: /crear cuenta gratis/i })
        expect(submitButton).not.toBeDisabled()
    })

    it('displays subtitle text', () => {
        render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>
        )

        expect(screen.getByText('Es gratis, siempre lo será')).toBeInTheDocument()
    })

    it('has accessible labels for all fields', () => {
        render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>
        )

        expect(screen.getByText('Nombre completo')).toBeInTheDocument()
        expect(screen.getByText('Email')).toBeInTheDocument()
        expect(screen.getByText('Contraseña')).toBeInTheDocument()
    })

    it('has proper autocomplete attributes for browser autofill', () => {
        render(
            <MemoryRouter>
                <Register />
            </MemoryRouter>
        )

        const nameInput = screen.getByRole('textbox', { name: /nombre completo/i })
        const emailInput = screen.getByRole('textbox', { name: /email/i })
        const passwordInput = screen.getByPlaceholderText('Mínimo 8 caracteres')

        expect(nameInput).toHaveAttribute('autocomplete', 'name')
        expect(emailInput).toHaveAttribute('autocomplete', 'email')
        expect(passwordInput).toHaveAttribute('autocomplete', 'new-password')
    })
})
