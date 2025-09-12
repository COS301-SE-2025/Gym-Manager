'use client';
import Link from 'next/link';
import Image from 'next/image';
import './dashboard-layout.css';
import { useRouter, usePathname } from 'next/navigation';
import { HomeIcon, UsersIcon, PackageIcon, ChartBarIcon, LogOutIcon } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    router.push('/');
    localStorage.removeItem('authToken');
  };

  return (
    <div className="dashboard-layout">
      <nav className="sidebar">
        <div className="logo-holder">
          <Image src="/trainwiselogo.svg" alt="Logo" width={240} height={55} priority />
        </div>
        <ul className="sidebar-nav">
          <li>
            <Link href="/dashboard" className={pathname === '/dashboard' ? 'active' : ''}>
              <HomeIcon size={20} />
              Home
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/users"
              className={pathname === '/dashboard/users' ? 'active' : ''}
            >
              <UsersIcon size={20} />
              User Management
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/packages"
              className={pathname === '/dashboard/packages' ? 'active' : ''}
            >
              <PackageIcon size={20} />
              Packages
            </Link>
          </li>
          <li>
            <Link
              href="/dashboard/reports"
              className={pathname === '/dashboard/reports' ? 'active' : ''}
            >
              <ChartBarIcon size={20} />
              Reports
            </Link>
          </li>
        </ul>
        <div className="logout-container">
          <Link href={'/'} onClick={handleLogout} className="logout">
            <LogOutIcon size={20} />
            Logout
          </Link>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
