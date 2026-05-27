'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="w-full bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
      <Link href="/" className="text-yellow-400 font-black text-lg tracking-wider">
        GN GLOVE
      </Link>
      <div className="flex items-center gap-6">
        <Link
          href="/about"
          className={`text-sm font-medium ${pathname === '/about' ? 'text-yellow-400' : 'text-gray-300 hover:text-white'}`}
        >
          About
        </Link>
        <Link
          href="/how-to-order"
          className={`text-sm font-medium ${pathname === '/how-to-order' ? 'text-yellow-400' : 'text-gray-300 hover:text-white'}`}
        >
          How to Order
        </Link>
        <Link
          href="/qna"
          className={`text-sm font-medium ${pathname === '/qna' ? 'text-yellow-400' : 'text-gray-300 hover:text-white'}`}
        >
          Q&A
        </Link>
      </div>
    </nav>
  );
}