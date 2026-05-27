'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Nav() {
  const pathname = usePathname();

  const links = [
  { href: '/gallery', label: 'Gallery' },
  { href: '/about', label: 'About' },
  { href: '/how-to-order', label: 'How to Order' },
  { href: '/qna', label: 'Q&A' },
];

  return (
    <nav className="w-full bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
      <Link href="/" className="text-yellow-400 font-black text-lg tracking-wider">
        GN GLOVE
      </Link>
      <div className="flex items-center gap-2">
        {links.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium px-3 py-1.5 rounded-full transition-all duration-200 ${
                active
                  ? 'bg-yellow-400 text-black'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}