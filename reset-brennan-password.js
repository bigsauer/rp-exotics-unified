const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE = 'https://astonishing-chicken-production.up.railway.app';

async function resetBrennanPassword() {
  console.log('🔧 Resetting Brennan password...\n');

  try {
    // First, let's try to use the forgot password feature
    console.log('1️⃣ Requesting password reset for brennan@rpexotics.com...');
    const resetResponse = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'brennan@rpexotics.com',
        newPassword: 'brennan123'
      })
    });

    if (resetResponse.ok) {
      console.log('✅ Password reset request sent successfully');
      console.log('📧 Check your email at brennan@rpexotics.com for the approval request');
      console.log('🔗 Or visit the admin interface to approve: https://astonishing-chicken-production.up.railway.app/admin');
    } else {
      const errorText = await resetResponse.text();
      console.log('❌ Password reset request failed:', resetResponse.status, errorText);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

resetBrennanPassword(); 