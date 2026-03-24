import type { ReactNode } from 'react'

interface LayoutProps {
    children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
    return (
        <div className="min-h-screen bg-gray-50 px-4">
            <div className="mx-auto max-w-md md:max-w-2xl py-8">
                {children}
            </div>
        </div>
    )
}