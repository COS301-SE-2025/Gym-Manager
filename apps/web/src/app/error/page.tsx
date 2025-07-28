'use client'

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import './style.css';

export default function ErrorPage() {
  const params = useSearchParams();
  const router = useRouter();
  const errorType = params.get('error');
  const message = params.get('message');

  const getErrorDetails = () => {
    switch (errorType) {
      case 'auth':
        return {
          title: 'Login Required',
          description: message || 'You need to login to access this page',
          action: { text: 'Login', path: '/' },
          colorClass: 'yellow'
        }
      case 'session':
        return {
          title: 'Session Expired',
          description: message || 'Your session has expired. Please login again.',
          action: { text: 'Login', path: '/' },
          colorClass: 'orange'
        }
      case '404':
        return {
          title: 'Page Not Found',
          description: message || "The page you're looking for doesn't exist.",
          action: { text: 'Go Home', path: '/' },
          colorClass: 'red'
        }
      default:
        return {
          title: 'Error',
          description: message || 'An unexpected error occurred',
          action: { text: 'Go back', path: '/' },
          colorClass: 'yellow'
        }
    }
  }

  const { title, description, action, colorClass } = getErrorDetails()

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }

  return (
    <div className={'container'}>
      <div className={'card'}>
        <h1 className={`${'title'} ${colorClass}`}>{title}</h1>
        {(errorType !== '404' && errorType) && (
            <p className={'description'}>{description}</p>
        )}
        {(errorType === '404' || !errorType) && (
          <button className={'button'} onClick={handleGoBack}>
            Go Back
          </button>
        )}
        {(errorType === 'auth' || errorType === 'session') && (
          <Link href={action.path} className={'button action'}>
            {action.text}
          </Link>
        )}
        {/* {(errorType === '404' || !errorType) && (
          <Link href={action.path} className={'button action'}>
            {action.text}
          </Link>
        )} */}
      </div>
    </div>
  )
}