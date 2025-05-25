import Link from "next/link"
import Image from "next/image";
import "./dashboard-layout.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
    return(
        <div className="dashboard-layout">
            <nav className="sidebar">
                <div className="logo-holder">
                    <Image src="/logo.png" alt="LOGO" />
                    <h2 className="sidebar-title">Trainwise</h2>
                </div>
                <ul className="sidebar-nav">
                    <li><Link href="/dashboard">Home</Link></li>
                    <li><Link href="/dashboard/classes">Classes</Link></li>
                </ul>
            </nav>
            <main>{children}</main>
        </div>
    );
}