import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from './storage';
import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { type User } from '@shared/schema';
import connectPgSimple from 'connect-pg-simple';

neonConfig.webSocketConstructor = ws;

// Set up PostgreSQL session store
const PgStore = connectPgSimple(session);

// Configure passport to use Google OAuth2
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: '/auth/google/callback',
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await storage.getUserByGoogleId(profile.id);

        if (!user) {
          // Create new user
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : '';
          const username = email.split('@')[0] + '_' + profile.id.substring(0, 4);
          
          user = await storage.createUser({
            username,
            email,
            googleId: profile.id,
            displayName: profile.displayName || username,
            profilePicture: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
          });
        }

        return done(null, user);
      } catch (error) {
        console.error('Error in Google auth strategy:', error);
        return done(error as Error);
      }
    }
  )
);

// Serialize user to store in session
passport.serializeUser((user: User, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Set up session middleware
export function setupAuth(app: express.Express) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  app.use(
    session({
      store: new PgStore({
        pool,
        tableName: 'session', // Name of session table
      }),
      secret: process.env.SESSION_SECRET || 'task-breaker-session-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // Auth routes
  app.get(
    '/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get(
    '/auth/google/callback',
    passport.authenticate('google', {
      successRedirect: '/',
      failureRedirect: '/login',
    })
  );

  app.get('/auth/logout', (req: Request, res: Response) => {
    req.logout(() => {
      res.redirect('/');
    });
  });

  app.get('/api/user', (req: Request, res: Response) => {
    if (req.isAuthenticated()) {
      res.json({ user: req.user });
    } else {
      res.json({ user: null });
    }
  });

  // Middleware to require login for API routes
  app.use('/api/goals', ensureAuthenticated);
}

// Middleware to check if user is authenticated
export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  // Special case for GET requests to /api/goals
  // If user is not authenticated, just return empty array instead of error
  if (req.method === 'GET' && req.path === '/') {
    return res.json([]);
  }
  
  res.status(401).json({ message: 'Unauthorized' });
}

// Middleware to check if user is authenticated for frontend
export function isAuthenticated(req: Request): boolean {
  return req.isAuthenticated();
}

// Schema for user registration
export const registerUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters long'),
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export type RegisterUserRequest = z.infer<typeof registerUserSchema>;

// Schema for user login
export const loginUserSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginUserRequest = z.infer<typeof loginUserSchema>;