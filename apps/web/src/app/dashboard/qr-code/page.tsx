'use client';
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './qr-code.css';

export default function QRCodePage() {
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Get the current URL origin and construct the registration URL
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    setRegistrationUrl(`${origin}/register`);
  }, []);

  const handleDownloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = 'trainwise-registration-qr.png';
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(registrationUrl);
      alert('Registration URL copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  if (!isMounted) {
    return (
      <div className="qr-code-page">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="qr-code-page">
      <div className="qr-code-header">
        <h1>Member Registration QR Code</h1>
        <p>
          Share this QR code with potential members to allow them to register from their mobile
          devices or browsers.
        </p>
      </div>

      <div className="qr-code-content">
        <div className="qr-code-display">
          <div className="qr-code-wrapper">
            <QRCodeSVG
              id="qr-code-svg"
              value={registrationUrl}
              size={300}
              level="H"
              includeMargin={true}
              bgColor="#1e1e1e"
              fgColor="#d8ff3e"
            />
          </div>
          <div className="qr-code-label">
            <h3>Scan to Register</h3>
            <p className="url-text">{registrationUrl}</p>
          </div>
        </div>

        <div className="qr-code-actions">
          <button onClick={handleDownloadQR} className="action-button primary">
            Download QR Code
          </button>
          <button onClick={handlePrint} className="action-button secondary">
            Print QR Code
          </button>
          <button onClick={handleCopyUrl} className="action-button secondary">
            Copy Registration URL
          </button>
        </div>

        <div className="qr-code-instructions">
          <h2>How to Use</h2>
          <ol>
            <li>
              <strong>Download or Print:</strong> Save the QR code image or print it directly.
            </li>
            <li>
              <strong>Display:</strong> Place the QR code in visible locations around your gym (front
              desk, entrance, workout areas).
            </li>
            <li>
              <strong>Members Scan:</strong> Potential members can scan the code with their phone
              camera to access the registration page.
            </li>
            <li>
              <strong>Registration:</strong> They complete the form and their account will be pending
              approval.
            </li>
            <li>
              <strong>Approve:</strong> You can approve new registrations from the User Management
              page.
            </li>
          </ol>
        </div>

        <div className="qr-code-tips">
          <h3>Tips for Best Results</h3>
          <ul>
            <li>Print the QR code in high quality for better scanning</li>
            <li>Ensure adequate lighting in areas where QR codes are displayed</li>
            <li>Place QR codes at eye level for easy access</li>
            <li>Keep the QR code at a size where it&apos;s easily scannable (minimum 2x2 inches)</li>
            <li>Test the QR code before distributing to ensure it works properly</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

