import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ThemeProvider, useTheme } from '../../context/ThemeContext'

// Component to test the hook
function TestComponent() {
    const { isDark, toggleTheme } = useTheme()
    return (
        <div>
            <span data-testid="theme-state">{isDark ? 'dark' : 'light'}</span>
            <button onClick={toggleTheme} data-testid="toggle-btn">Toggle</button>
        </div>
    )
}

describe('ThemeContext', () => {
    let originalLocalStorage: Storage

    beforeEach(() => {
        originalLocalStorage = window.localStorage
        // Create a mock localStorage
        const mockStorage: Record<string, string> = {}
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: (key: string) => mockStorage[key] ?? null,
                setItem: (key: string, value: string) => { mockStorage[key] = value },
                removeItem: (key: string) => { delete mockStorage[key] },
                clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]) },
            },
            writable: true,
        })
    })

    afterEach(() => {
        Object.defineProperty(window, 'localStorage', {
            value: originalLocalStorage,
            writable: true,
        })
    })

    it('provides initial theme from localStorage or system preference', () => {
        // By default without localStorage setting, uses system preference (mocked to false)
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        )

        expect(screen.getByTestId('theme-state')).toHaveTextContent('light')
    })

    it('toggles theme state', async () => {
        const user = userEvent.setup()
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        )

        expect(screen.getByTestId('theme-state')).toHaveTextContent('light')

        await user.click(screen.getByTestId('toggle-btn'))

        expect(screen.getByTestId('theme-state')).toHaveTextContent('dark')
    })

    it('persists theme in localStorage on toggle', async () => {
        const user = userEvent.setup()
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        )

        await user.click(screen.getByTestId('toggle-btn'))

        expect(window.localStorage.getItem('theme')).toBe('dark')
    })

    it('loads saved theme from localStorage on mount', async () => {
        window.localStorage.setItem('theme', 'dark')

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        )

        expect(screen.getByTestId('theme-state')).toHaveTextContent('dark')
    })

    it('throws error when useTheme is used outside ThemeProvider', () => {
        // Suppress console.error for this test
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { })

        expect(() => {
            render(<TestComponent />)
        }).toThrow('useTheme must be used within ThemeProvider')

        consoleSpy.mockRestore()
    })

    it('toggles back and forth between themes', async () => {
        const user = userEvent.setup()
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        )

        expect(screen.getByTestId('theme-state')).toHaveTextContent('light')

        await user.click(screen.getByTestId('toggle-btn'))
        expect(screen.getByTestId('theme-state')).toHaveTextContent('dark')

        await user.click(screen.getByTestId('toggle-btn'))
        expect(screen.getByTestId('theme-state')).toHaveTextContent('light')
    })
})
