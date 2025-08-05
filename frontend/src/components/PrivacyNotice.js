import React from 'react';

const PrivacyNotice = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
      
      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Information We Collect</h2>
          <p className="mb-3">
            We collect information you provide directly to us, such as when you create a deal, upload documents, or sign contracts electronically.
          </p>
          <p className="mb-3">
            This includes:
          </p>
          <ul className="list-disc pl-6 mb-3">
            <li>Contact information (name, email, phone number)</li>
            <li>Vehicle information (VIN, make, model, year)</li>
            <li>Deal information (purchase price, terms, documents)</li>
            <li>Electronic signatures and consent records</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Analytics and Tracking</h2>
          <p className="mb-3">
            We use Google Analytics to understand how users interact with our application. This helps us improve our services and user experience.
          </p>
          <p className="mb-3">
            Google Analytics may collect:
          </p>
          <ul className="list-disc pl-6 mb-3">
            <li>Pages visited and time spent on each page</li>
            <li>User interactions (button clicks, form submissions)</li>
            <li>Device information (browser type, screen resolution)</li>
            <li>General location information (city/country level)</li>
          </ul>
          <p className="mb-3">
            <strong>Important:</strong> We do not track or store personal information (names, emails, VINs) in Google Analytics. All analytics data is anonymized and aggregated.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Electronic Signatures</h2>
          <p className="mb-3">
            Our electronic signature system complies with the ESIGN Act (2000) and UETA. When you sign documents electronically, we collect:
          </p>
          <ul className="list-disc pl-6 mb-3">
            <li>Your explicit consent to use electronic signatures</li>
            <li>Your intent to sign the specific document</li>
            <li>Signature data (drawn or typed signature)</li>
            <li>Audit trail information (IP address, timestamp, device info)</li>
          </ul>
          <p className="mb-3">
            This information is required for legal compliance and to ensure the validity of electronic signatures.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">How We Use Your Information</h2>
          <p className="mb-3">
            We use the information we collect to:
          </p>
          <ul className="list-disc pl-6 mb-3">
            <li>Process and manage vehicle deals</li>
            <li>Generate legally binding documents</li>
            <li>Facilitate electronic signatures</li>
            <li>Improve our application and user experience</li>
            <li>Comply with legal and regulatory requirements</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Security</h2>
          <p className="mb-3">
            We implement appropriate security measures to protect your information, including:
          </p>
          <ul className="list-disc pl-6 mb-3">
            <li>Encryption of data in transit and at rest</li>
            <li>Secure authentication and authorization</li>
            <li>Regular security audits and updates</li>
            <li>Limited access to personal information</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Data Retention</h2>
          <p className="mb-3">
            We retain your information for as long as necessary to:
          </p>
          <ul className="list-disc pl-6 mb-3">
            <li>Provide our services</li>
            <li>Comply with legal obligations</li>
            <li>Resolve disputes</li>
            <li>Enforce our agreements</li>
          </ul>
          <p className="mb-3">
            Electronic signature records are retained for the legally required period to maintain their validity.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Your Rights</h2>
          <p className="mb-3">
            You have the right to:
          </p>
          <ul className="list-disc pl-6 mb-3">
            <li>Access your personal information</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your information (subject to legal requirements)</li>
            <li>Opt out of analytics tracking</li>
            <li>Contact us with privacy concerns</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact Us</h2>
          <p className="mb-3">
            If you have questions about this privacy policy or our data practices, please contact us at:
          </p>
          <p className="mb-3">
            <strong>RP Exotics</strong><br />
            Email: privacy@rpexotics.com<br />
            Phone: (555) 123-4567
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Updates to This Policy</h2>
          <p className="mb-3">
            We may update this privacy policy from time to time. We will notify you of any material changes by posting the new policy on our website and updating the "Last Updated" date.
          </p>
          <p className="text-sm text-gray-500">
            Last Updated: {new Date().toLocaleDateString()}
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyNotice; 