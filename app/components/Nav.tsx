'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Nav() {
  const pathname = usePathname();

  const links = [
    { href: '/gallery', label: '🖼️ Gallery' },
    { href: '/about', label: '📌 About' },
    { href: '/how-to-order', label: '📖 How to Order' },
    { href: '/qna', label: '❓ Q&A' },
  ];

  return (
    <nav className="w-full bg-gray-950 border-b border-gray-800 px-4 pt-4 pb-3">
      {/* 로고 중앙 상단 */}
      <div className="text-center mb-3">
        <Link href="/" className="text-yellow-400 font-black text-xl tracking-wider">
          GN GLOVE
        </Link>
      </div>

      {/* 버튼 4개 - 최대 너비 제한 + 중앙 정렬 */}
      <div className="max-w-2xl mx-auto grid grid-cols-4 gap-2">
        {links.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`text-center text-xs font-medium py-2 px-1 rounded-xl transition-all duration-200 ${
                active
                  ? 'bg-yellow-400 text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
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