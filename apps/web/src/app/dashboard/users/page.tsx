'use server'
import { UserTable } from './table/page';
export default function MembersList() {
    return(
        <main className="users-page">
      <section className="user-section">
        <h2>Members</h2>
        <UserTable role="member" />
      </section>

      <section className="user-section">
        <h2>Coaches</h2>
        <UserTable role="coach"/>
      </section>

      <section className="user-section">
        <h2>Administrators</h2>
        <UserTable role="admin" />
      </section>
    </main>
    );
}