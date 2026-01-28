import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { StatusModal } from './StatusModal'

const navigation = [
  { name: 'Executive', href: '/executive' },
  { name: 'Teams', href: '/teams' },
]

export function Layout() {
  const location = useLocation()
  const [showStatusModal, setShowStatusModal] = useState(false)

  return (
    <div className="min-h-screen bg-pearson-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-pearson-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-pearson-blue rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">K</span>
                </div>
                <span className="text-xl font-semibold text-pearson-gray-900">KWeX</span>
              </Link>
              <span className="text-xs text-pearson-gray-500 hidden sm:block">
                Knowledge Worker Experience
              </span>
            </div>

            {/* Navigation */}
            <nav className="flex items-center gap-6">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'text-sm font-medium transition-colors',
                    location.pathname === item.href ||
                    (item.href !== '/executive' && location.pathname.startsWith(item.href))
                      ? 'text-pearson-blue'
                      : 'text-pearson-gray-600 hover:text-pearson-gray-900'
                  )}
                >
                  {item.name}
                </Link>
              ))}

              {/* Status Button */}
              <button
                onClick={() => setShowStatusModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="System Status"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="hidden sm:inline">Status</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Status Modal */}
      <StatusModal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} />

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-pearson-gray-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-pearson-gray-500">
            KWeX - Knowledge Worker Experience Platform | System Diagnosis Only - Not for Performance Management
          </p>
        </div>
      </footer>
    </div>
  )
}
