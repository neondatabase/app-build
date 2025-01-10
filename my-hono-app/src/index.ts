
import { Hono } from 'hono';
import { neon } from '@neondatabase/serverless';
import { cors } from 'hono/cors';

type Env = {
  DATABASE_URL: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use('/*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'PUT', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length', 'X-Requested-With'],
}));

// GET all users
app.get('/users', async (c) => {
  if (!c.env.DATABASE_URL) {
    return c.json({ error: 'DATABASE_URL is not set' }, 500);
  }

  const sql = neon(c.env.DATABASE_URL);

  try {
    const result = await sql`
      SELECT 
        id,
        username,
        email,
        created_at
      FROM public.users
      ORDER BY created_at DESC
    `;
    return c.json(result);
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);
  }
});

// GET single user
app.get('/users/:id', async (c) => {
  if (!c.env.DATABASE_URL) {
    return c.json({ error: 'DATABASE_URL is not set' }, 500);
  }

  const sql = neon(c.env.DATABASE_URL);
  const userId = parseInt(c.req.param('id'));

  if (isNaN(userId)) {
    return c.json({ error: 'Invalid user ID' }, 400);
  }

  try {
    const result = await sql`
      SELECT 
        id,
        username,
        email,
        created_at
      FROM public.users
      WHERE id = ${userId}
    `;

    if (result.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json(result[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    return c.json({ error: 'Failed to fetch user' }, 500);
  }
});

// POST new user
app.post('/users', async (c) => {
  if (!c.env.DATABASE_URL) {
    return c.json({ error: 'DATABASE_URL is not set' }, 500);
  }

  const sql = neon(c.env.DATABASE_URL);
  
  try {
    const body = await c.req.json();
    
    // Basic validation
    if (!body.username || !body.email || !body.password_hash) {
      return c.json({ error: 'Username, email, and password are required' }, 400);
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return c.json({ error: 'Invalid email format' }, 400);
    }

    const result = await sql`
      INSERT INTO public.users (
        username,
        email,
        password_hash,
        created_at
      ) VALUES (
        ${body.username},
        ${body.email},
        ${body.password_hash},
        CURRENT_TIMESTAMP
      )
      RETURNING id, username, email, created_at
    `;

    return c.json(result[0], 201);
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      // Unique constraint violation
      if (error.code === '23505') {
        return c.json({ error: 'Username or email already exists' }, 409);
      }
    }
    console.error('Error creating user:', error);
    return c.json({ error: 'Failed to create user' }, 500);
  }
});

// PUT update user
app.put('/users/:id', async (c) => {
  if (!c.env.DATABASE_URL) {
    return c.json({ error: 'DATABASE_URL is not set' }, 500);
  }

  const sql = neon(c.env.DATABASE_URL);
  const userId = parseInt(c.req.param('id'));

  if (isNaN(userId)) {
    return c.json({ error: 'Invalid user ID' }, 400);
  }

  try {
    const body = await c.req.json();
    
    // Validate email if provided
    if (body.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return c.json({ error: 'Invalid email format' }, 400);
      }
    }

    const result = await sql`
      UPDATE public.users
      SET
        username = COALESCE(${body.username}, username),
        email = COALESCE(${body.email}, email),
        password_hash = COALESCE(${body.password_hash}, password_hash)
      WHERE id = ${userId}
      RETURNING id, username, email, created_at
    `;

    if (result.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json(result[0]);
  } catch (error) {
    if (error instanceof Error && 'code' in error) {
      if (error.code === '23505') {
        return c.json({ error: 'Username or email already exists' }, 409);
      }
    }
    console.error('Error updating user:', error);
    return c.json({ error: 'Failed to update user' }, 500);
  }
});

// DELETE user
app.delete('/users/:id', async (c) => {
  if (!c.env.DATABASE_URL) {
    return c.json({ error: 'DATABASE_URL is not set' }, 500);
  }

  const sql = neon(c.env.DATABASE_URL);
  const userId = parseInt(c.req.param('id'));

  if (isNaN(userId)) {
    return c.json({ error: 'Invalid user ID' }, 400);
  }

  try {
    const result = await sql`
      DELETE FROM public.users
      WHERE id = ${userId}
      RETURNING id
    `;

    if (result.length === 0) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return c.json({ error: 'Failed to delete user' }, 500);
  }
});

export default app;
