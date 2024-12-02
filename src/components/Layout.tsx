import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiMenu, FiX, FiUser, FiLogOut, FiBook, FiDollarSign, FiGrid } from 'react-icons/fi';
import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { User } from 'firebase/auth';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
    });

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      unsubscribe();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header 
        className={`fixed w-full z-50 transition-all duration-200 ${
          isScrolled ? 'bg-white shadow-md' : 'bg-transparent'
        }`}
      >
        <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <div className="w-8 h-8 bg-primary rounded-lg"></div>
              <div className="absolute -inset-0.5 bg-primary opacity-20 blur rounded-lg"></div>
            </motion.div>
            <span className={`text-xl font-bold transition-colors duration-200 ${
              isScrolled ? 'text-primary' : 'text-primary'
            }`}>
              Addressd
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/docs" 
              className={`flex items-center space-x-2 transition-colors duration-200 ${
                isScrolled ? 'text-gray-600 hover:text-primary' : 'text-gray-800 hover:text-primary'
              }`}
            >
              <FiBook className="text-lg" />
              <span>Docs</span>
            </Link>
            <Link 
              href="/pricing" 
              className={`flex items-center space-x-2 transition-colors duration-200 ${
                isScrolled ? 'text-gray-600 hover:text-primary' : 'text-gray-800 hover:text-primary'
              }`}
            >
              <FiDollarSign className="text-lg" />
              <span>Pricing</span>
            </Link>
            {user ? (
              <>
                <Link 
                  href="/dashboard" 
                  className={`flex items-center space-x-2 transition-colors duration-200 ${
                    isScrolled ? 'text-gray-600 hover:text-primary' : 'text-gray-800 hover:text-primary'
                  }`}
                >
                  <FiGrid className="text-lg" />
                  <span>Dashboard</span>
                </Link>
                <div className="relative group">
                  <button className={`flex items-center space-x-2 transition-colors duration-200 ${
                    isScrolled ? 'text-gray-600 hover:text-primary' : 'text-gray-800 hover:text-primary'
                  }`}>
                    <FiUser className="text-lg" />
                    <span>{user.email}</span>
                  </button>
                  <div className="absolute right-0 w-48 mt-2 py-2 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <Link 
                      href="/profile" 
                      className="block px-4 py-2 text-gray-800 hover:bg-gray-50 transition-colors duration-200"
                    >
                      Profile
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-50 transition-colors duration-200 flex items-center"
                    >
                      <FiLogOut className="mr-2" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <Link
                href="/signup"
                className="button button-primary"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className={`md:hidden transition-colors duration-200 ${
              isScrolled ? 'text-gray-600 hover:text-primary' : 'text-gray-800 hover:text-primary'
            }`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </nav>

        {/* Mobile Navigation */}
        <motion.div
          initial={false}
          animate={{ 
            height: isMenuOpen ? 'auto' : 0,
            opacity: isMenuOpen ? 1 : 0
          }}
          transition={{ duration: 0.2 }}
          className="md:hidden overflow-hidden bg-white border-t border-gray-200 shadow-lg"
        >
          <div className="container mx-auto px-4 py-4 space-y-4">
            <Link
              href="/docs"
              className="flex items-center space-x-2 text-gray-600 hover:text-primary transition-colors duration-200"
              onClick={() => setIsMenuOpen(false)}
            >
              <FiBook className="text-lg" />
              <span>Documentation</span>
            </Link>
            <Link
              href="/pricing"
              className="flex items-center space-x-2 text-gray-600 hover:text-primary transition-colors duration-200"
              onClick={() => setIsMenuOpen(false)}
            >
              <FiDollarSign className="text-lg" />
              <span>Pricing</span>
            </Link>
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center space-x-2 text-gray-600 hover:text-primary transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FiGrid className="text-lg" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center space-x-2 text-gray-600 hover:text-primary transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FiUser className="text-lg" />
                  <span>Profile</span>
                </Link>
                <button
                  onClick={() => {
                    handleSignOut();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-2 text-gray-600 hover:text-primary transition-colors duration-200"
                >
                  <FiLogOut className="text-lg" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <Link
                href="/signup"
                onClick={() => setIsMenuOpen(false)}
                className="button button-primary w-full text-center"
              >
                Sign In
              </Link>
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