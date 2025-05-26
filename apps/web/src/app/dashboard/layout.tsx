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
                    <Image src="/trainwiselogo.svg" alt="Logo" width={295} height={67} priority/> {/* original size= width: 354 , height:81*/}
                </div>
                <ul className="sidebar-nav">
                    <li><Link href="/dashboard">Home</Link></li>
                    <li><Link href="/dashboard/classes">Classes</Link></li>
                    <li><Link href="/dashboard/members">Members</Link></li>
                    <li><Link href="/dashboard/reports">Packages</Link></li>
                    <li><Link href="/dashboard/reports">Reports</Link></li>
                </ul>
            </nav>
            <main>{children}</main>
        </div>
    );
}