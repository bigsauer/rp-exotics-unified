// Add this to app.js temporarily to debug users
app.get('/api/debug/users', async (req, res) => {
  try {
    console.log('[DEBUG] Checking users in database...');
    
    const users = await db.collection('users').find({}).toArray();
    console.log(`[DEBUG] Found ${users.length} users`);
    
    const userList = users.map(user => ({
      id: user._id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      firstName: user.firstName,
      lastName: user.lastName
    }));
    
    console.log('[DEBUG] Users:', userList);
    
    res.json({
      count: users.length,
      users: userList
    });
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

console.log('[DEBUG] Debug endpoint added: /api/debug/users'); 