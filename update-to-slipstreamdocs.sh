#!/bin/bash

echo "🔧 Updating email service to use slipstreamdocs.com domain..."

# Replace all instances of onboarding@resend.dev with noreply@slipstreamdocs.com
sed -i '' 's/onboarding@resend\.dev/noreply@slipstreamdocs.com/g' backend/services/emailService.js

# Replace the comment about default domain
sed -i '' 's/Use Resend'\''s default domain for sending (until rpexotics.com is verified)/Use verified slipstreamdocs.com domain for sending/g' backend/services/emailService.js

echo "✅ Email domain updated! All emails will now use noreply@slipstreamdocs.com"
echo "📧 Professional domain ready for sending emails" 