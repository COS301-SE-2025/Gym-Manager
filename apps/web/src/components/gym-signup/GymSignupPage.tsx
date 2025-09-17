'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import './gym-signup.css';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  originalPrice?: number;
}

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    period: 'month',
    description: 'Perfect for small gyms getting started',
    features: [
      'Class scheduling & check-ins',
      'Up to 150 members',
      'Email support'
    ]
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 119,
    period: 'month',
    description: 'Ideal for growing gyms',
    features: [
      'Memberships & payments',
      'Coach portal & roles',
      'Priority support'
    ],
    popular: true
  },
  {
    id: 'pro-single',
    name: 'Pro (Single location)',
    price: 165,
    period: 'month',
    description: 'For established single-location gyms',
    features: [
      'Unlimited members & classes',
      'Advanced analytics',
      'Phone support'
    ]
  },
  {
    id: 'pro-plus',
    name: 'Pro Plus (Multi-location)',
    price: 195,
    period: 'month',
    description: 'For gym chains with multiple locations',
    features: [
      'Multi-location dashboards',
      'Permissions & audit logs',
      'API access'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0,
    period: 'contact',
    description: 'Custom solutions for large organizations',
    features: [
      'Custom SLAs & onboarding',
      'Dedicated CSM',
      'Security review & SSO'
    ]
  }
];

export default function GymSignupPage() {
  const [selectedPlan, setSelectedPlan] = useState<string>('growth');
  const [isProcessing, setIsProcessing] = useState(false);

  const formatPrice = (price: number, period: string) => {
    if (period === 'contact') {
      return 'Contact us';
    }
    return `R${price.toLocaleString()}`;
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    
    // Mock payment processing
    setTimeout(() => {
      alert('Mock payment successful! Your gym has been signed up for Trainwise.');
      setIsProcessing(false);
    }, 2000);
  };

  return (
    <main className="gym-signup-root">
      <header className="signup-header">
        <div className="container">
          <div className="nav">
            <div className="brand">
              <Link href="/">
                <Image src="/trainwiselogo.svg" alt="Trainwise" width={177} height={40} priority />
              </Link>
            </div>
            <nav className="nav-links">
              <Link href="/">About</Link>
              <Link href="/login">Login</Link>
            </nav>
          </div>
        </div>
      </header>

      <section className="signup-hero">
        <div className="container">
          <div className="hero-content">
            <h1>Choose Your Plan</h1>
            <p>Start your gym management journey with Trainwise. Select the plan that fits your needs.</p>
          </div>
        </div>
      </section>

      <section className="pricing-section">
        <div className="container">
          <div className="pricing-grid">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`pricing-card ${plan.popular ? 'popular' : ''} ${
                  selectedPlan === plan.id ? 'selected' : ''
                }`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.popular && (
                  <div className="popular-badge">Most Popular</div>
                )}
                
                <div className="plan-header">
                  <h3>{plan.name}</h3>
                  <div className="price">
                    <span className="amount">{formatPrice(plan.price, plan.period)}</span>
                    {plan.period !== 'contact' && <span className="period">/{plan.period}</span>}
                  </div>
                  <p className="description">{plan.description}</p>
                </div>

                <ul className="features">
                  {plan.features.map((feature, index) => (
                    <li key={index}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M13.5 4.5L6 12L2.5 8.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  className={`select-plan-btn ${selectedPlan === plan.id ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlan(plan.id);
                  }}
                >
                  {selectedPlan === plan.id ? 'Selected' : 'Select Plan'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="payment-section">
        <div className="container">
          <div className="payment-card">
            <h2>Complete Your Signup</h2>
            <p>You're about to start your free trial with the {SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan)?.name} plan.</p>
            
            <div className="payment-summary">
              <div className="summary-row">
                <span>Plan</span>
                <span>{SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan)?.name}</span>
              </div>
              <div className="summary-row">
                <span>Price</span>
                <span>
                  {SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan)?.period === 'contact' 
                    ? 'Contact us for pricing'
                    : `${formatPrice(SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan)?.price || 0, 'month')}/month`
                  }
                </span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>
                  {SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan)?.period === 'contact' 
                    ? 'Contact us for pricing'
                    : `${formatPrice(SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan)?.price || 0, 'month')}/month`
                  }
                </span>
              </div>
            </div>

            {SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan)?.period !== 'contact' && (
              <>
                <div className="payment-methods">
                  <h3>Payment Method</h3>
                  <div className="payment-options">
                    <div className="payment-option selected">
                      <div className="card-icon">💳</div>
                      <span>Credit Card</span>
                    </div>
                    <div className="payment-option">
                      <div className="card-icon">🏦</div>
                      <span>Bank Transfer</span>
                    </div>
                  </div>
                </div>

                <div className="mock-payment-form">
                  <div className="form-group">
                    <label>Card Number</label>
                    <input type="text" placeholder="1234 5678 9012 3456" />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Expiry Date</label>
                      <input type="text" placeholder="MM/YY" />
                    </div>
                    <div className="form-group">
                      <label>CVV</label>
                      <input type="text" placeholder="123" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Cardholder Name</label>
                    <input type="text" placeholder="John Doe" />
                  </div>
                </div>
              </>
            )}

            <button
              className="pay-now-btn"
              onClick={handlePayment}
              disabled={isProcessing}
            >
              {isProcessing 
                ? 'Processing...' 
                : SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan)?.period === 'contact'
                  ? 'Contact Sales Team'
                  : `Start Free Trial - ${formatPrice(SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan)?.price || 0, 'month')}/month`
              }
            </button>

            <p className="trial-info">
              {SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan)?.period === 'contact' 
                ? 'Our sales team will contact you within 24 hours to discuss your needs.'
                : 'Start with a 14-day free trial. Cancel anytime.'
              }
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
