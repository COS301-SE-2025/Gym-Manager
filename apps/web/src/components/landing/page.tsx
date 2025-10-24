import Image from 'next/image';
import Link from 'next/link';
import './landing.css';

export default function LandingPage() {
  return (
    <main className="landing-root">
      <header className="landing-header">
        <div className="container nav">
          <div className="brand">
            <Link href="/">
              <Image src="/trainwiselogo.svg" alt="Trainwise" width={177} height={40} priority />
            </Link>
          </div>
          <nav className="nav-links">
            <a href="#reasons">Why Trainwise</a>
            <a href="#membership">Pricing</a>
            <a href="#trainers">Features</a>
            <a href="#about">About</a>
            <a className="nav-cta" href="/signup">
              Get Started
            </a>
            <a href="/login">
              Login
            </a>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-text">
            <h1>HIIT gym management software</h1>
            <Link href="/signup">
              <button className="btn-primary">Get Started Free</button>
            </Link>
          </div>
          <div className="hero-media">
            <Image
              className="hero-image"
              src="/gym1.jpg"
              alt="Trainwise HIIT studio"
              width={800}
              height={600}
              priority
            />
          </div>
        </div>
      </section>

      <section className="mobile-download">
        <div className="container">
          <h2>Download our mobile app</h2>
          <p>Access Trainwise on the go with our mobile app</p>
          <div className="download-buttons">
            <a 
              href="https://github.com/COS301-SE-2025/Gym-Manager/releases/download/1.2.0/TrainWise.apk"
              className="download-btn android-btn"
              download
            >
              <svg className="download-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.5559L4.841 5.9037a.416.416 0 00-.5676-.1521.416.416 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" fill="currentColor"/>
              </svg>
              <div className="download-text">
                <span className="download-label">Download for</span>
                <span className="download-platform">Android</span>
              </div>
            </a>
            <a 
              href="https://testflight.apple.com/join/THhUcHa2"
              className="download-btn apple-btn"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="download-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="currentColor"/>
              </svg>
              <div className="download-text">
                <span className="download-label">Download for</span>
                <span className="download-platform">iOS</span>
              </div>
            </a>
          </div>
        </div>
      </section>

      <section id="reasons" className="reasons">
        <div className="container">
          <h2>Why Trainwise</h2>
          <div className="reason-grid">
            <ReasonCard
              title="Automated class scheduling"
              text="Build recurring HIIT timetables, waitlists and capacity rules in minutes."
            />
            <ReasonCard
              title="Memberships & passes"
              text="Create flexible passes and contracts with auto‑billing and proration."
            />
            <ReasonCard
              title="Integrated payments"
              text="Stripe-powered checkout, failed payment recovery and refunds built‑in."
            />
            <ReasonCard
              title="Real‑time attendance"
              text="QR/mobile check‑in, no‑shows, and live occupancy dashboards."
            />
          </div>
        </div>
      </section>

      <section id="membership" className="membership">
        <div className="container">
          <h2>Plans & pricing</h2>
          <div className="card-grid">
            <MembershipCard
              name={'Free Trial'}
              price="R 0"
              benefits={[
                '14‑day sandbox with full access',
                'Sample data to explore',
                'No credit card required',
              ]}
            />
            <MembershipCard
              name={'Starter'}
              price="R 49"
              benefits={['Class scheduling & check‑ins', 'Up to 150 members', 'Email support']}
            />
            <MembershipCard
              name={'Growth'}
              price="R 119"
              benefits={['Memberships & payments', 'Coach portal & roles', 'Priority support']}
            />
            <MembershipCard
              name={'Pro (Single location)'}
              price="R 165"
              benefits={['Unlimited members & classes', 'Advanced analytics', 'Phone support']}
            />
            <MembershipCard
              name={'Pro Plus (Multi‑location)'}
              price="R 195"
              benefits={['Multi‑location dashboards', 'Permissions & audit logs', 'API access']}
            />
            <MembershipCard
              name={'Enterprise'}
              price="Contact"
              benefits={['Custom SLAs & onboarding', 'Dedicated CSM', 'Security review & SSO']}
            />
          </div>
        </div>
      </section>

      <section id="about" className="about">
        <div className="container about-grid">
          <div className="about-copy">
            <h2>About us</h2>
            <p>
              Trainwise is an all‑in‑one HIIT gym management platform. We power class scheduling,
              bookings, memberships, payments, check‑ins, and analytics in one intuitive dashboard.
            </p>
            <p>
              Built for high‑intensity studios, Trainwise reduces admin, improves retention and
              helps your team deliver exceptional member experiences across web and mobile.
            </p>
          </div>
          <div className="about-media">
            <Image
              className="about-image"
              src="/gym2.jpg"
              alt="Facility view"
              width={900}
              height={600}
            />
          </div>
        </div>
      </section>

      <section id="trainers" className="trainers">
        <div className="container">
          <h2>Platform features</h2>
          <div className="trainer-grid">
            {[
              { name: 'Class scheduling', img: '/gym1.jpg' },
              { name: 'Member mobile app', img: '/gym2.jpg' },
              { name: 'QR check‑in & access', img: '/gym3.jpg' },
              { name: 'Coach portal', img: '/gym1.jpg' },
              { name: 'Payments & billing', img: '/gym2.jpg' },
              { name: 'CRM & messaging', img: '/gym3.jpg' },
              { name: 'Live leaderboards', img: '/gym2.jpg' },
              { name: 'Reports & analytics', img: '/gym1.jpg' },
            ].map(({ name, img }) => (
              <div className="trainer-card" key={name}>
                <Image src={img} alt={name} width={480} height={320} className="card-image" />
                <div className="trainer-info">
                  <h4>{name}</h4>
                  <div className="trainer-icons">
                    <IconCircle />
                    <IconCircle />
                    <IconCircle />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <Image src="/trainwiselogo.svg" alt="Trainwise" width={177} height={40} />
            <p>
              All‑in‑one HIIT gym management software: schedules, bookings, payments, CRM and
              analytics.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function ReasonCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="reason">
      <IconSpark />
      <div>
        <h4>{title}</h4>
        <p>{text}</p>
      </div>
    </div>
  );
}

function MembershipCard({
  name,
  price,
  benefits,
}: {
  name: string;
  price: string;
  benefits: string[];
}) {
  return (
    <div className="plan-card">
      <div className="plan-head">
        <span className="plan-name">{name}</span>
        <span className="plan-price">{price}</span>
      </div>
      <ul className="plan-list">
        {benefits.map((b) => (
          <li key={b}>
            <span className="bullet" />
            {b}
          </li>
        ))}
      </ul>
      <button className="btn-outline">Buy</button>
    </div>
  );
}

function IconSpark() {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M12 2v4M12 18v4M4 12H0M24 12h-4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
        stroke="#D8FF3E"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCircle() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="9" cy="9" r="7" stroke="#D8FF3E" strokeWidth="2" />
    </svg>
  );
}
