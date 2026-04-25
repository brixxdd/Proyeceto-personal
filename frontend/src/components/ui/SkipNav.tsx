/**
 * SkipNav — WCAG 2.4.1 bypass blocks
 * Allows keyboard users to skip repetitive navigation links
 */
export default function SkipNav() {
    return (
        <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-3 focus:bg-[var(--color-primary)] focus:text-white focus:rounded-[14px] focus:font-semibold focus:text-[15px] focus:shadow-lg"
        >
            Saltar al contenido principal
        </a>
    )
}
