#!/bin/bash

echo "🔧 Fixing email domain back to onboarding@resend.dev..."

# Replace all instances of noreply@rpexotics.com with onboarding@resend.dev
sed -i '' 's/noreply@rpexotics\.com/onboarding@resend.dev/g' backend/services/emailService.js

# Replace the comment about verified domain
sed -i '' 's/Use verified domain for sending (once domain is verified with Resend)/Use Resend'\''s default domain for sending (until rpexotics.com is verified)/g' backend/services/emailService.js

echo "✅ Email domain fixed! All emails will now use onboarding@resend.dev"
echo "📧 You can now send emails to any recipient" 