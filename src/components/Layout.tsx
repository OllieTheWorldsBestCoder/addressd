import { ReactNode } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiMenu, FiX, FiUser, FiLogOut } from 'react-icons/fi';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 fixed w-full z-50">
        <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* Replace with your actual logo */}
              <div className="w-8 h-8 bg-primary rounded-lg"></div>
            </motion.div>
            <span className="text-xl font-bold text-primary">Addressd</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/docs" className="text-gray-600 hover:text-primary transition-colors">
              Documentation
            </Link>
            <Link href="/pricing" className="text-gray-600 hover:text-primary transition-colors">
              Pricing
            </Link>
            {session ? (
              <>
                <Link href="/dashboard" className="text-gray-600 hover:text-primary transition-colors">
                  Dashboard
                </Link>
                <div className="relative group">
                  <button className="flex items-center space-x-2 text-gray-600 hover:text-primary transition-colors">
                    <FiUser />
                    <span>{session.user?.email}</span>
                  </button>
                  <div className="absolute right-0 w-48 mt-2 py-2 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <Link href="/profile" className="block px-4 py-2 text-gray-800 hover:bg-gray-100">
                      Profile
                    </Link>
                    <button
                      onClick={() => signOut()}
                      className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 flex items-center"
                    >
                      <FiLogOut className="mr-2" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <button
                onClick={() => signIn()}
                className="px-6 py-2 bg-primary text-white rounded-full hover:bg-primary-light transition-all"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-600 hover:text-primary transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </nav>

        {/* Mobile Navigation */}
        <motion.div
          initial={false}
          animate={{ height: isMenuOpen ? 'auto' : 0, opacity: isMenuOpen ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          className="md:hidden overflow-hidden bg-white border-t border-gray-200"
        >
          <div className="container mx-auto px-4 py-4 space-y-4">
            <Link
              href="/docs"
              className="block text-gray-600 hover:text-primary transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Documentation
            </Link>
            <Link
              href="/pricing"
              className="block text-gray-600 hover:text-primary transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Pricing
            </Link>
            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className="block text-gray-600 hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className="block text-gray-600 hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setIsMenuOpen(false);
                  }}
                  className="w-full text-left text-gray-600 hover:text-primary transition-colors flex items-center"
                >
                  <FiLogOut className="mr-2" />
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  signIn();
                  setIsMenuOpen(false);
                }}
                className="w-full px-6 py-2 bg-primary text-white rounded-full hover:bg-primary-light transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        </motion.div>
      </header>

      {/* Main Content */}
      <main className="flex-grow pt-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Product</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/features" className="text-gray-600 hover:text-primary transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-gray-600 hover:text-primary transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/docs" className="text-gray-600 hover:text-primary transition-colors">
                    Documentation
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/about" className="text-gray-600 hover:text-primary transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-gray-600 hover:text-primary transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="text-gray-600 hover:text-primary transition-colors">
                    Careers
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/privacy" className="text-gray-600 hover:text-primary transition-colors">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-gray-600 hover:text-primary transition-colors">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Connect</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="https://twitter.com/addressd"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-primary transition-colors"
                  >
                    Twitter
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/addressd"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 hover:text-primary transition-colors"
                  >
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-center text-gray-600">
              © {new Date().getFullYear()} Addressd. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 