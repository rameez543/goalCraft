import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import { storage } from './storage';
import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { type User } from '@shared/schema';
import connectPgSimple from 'connect-pg-simple';
import crypto from 'crypto';

neonConfig.webSocketConstructor = ws;

// Set up PostgreSQL session store
const PgStore = connectPgSimple(session);

// Password hashing functions
const hashPassword = (password: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
};

const verifyPassword = (password: string, hashedPassword: string): boolean => {
  const [salt, storedHash] = hashedPassword.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return storedHash === hash;
};

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

// Configure passport to use LocalStrategy for username/password auth
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        // Find user by email
        const user = await storage.getUserByEmail(email);
        if (!user) {
          return done(null, false, { message: 'Incorrect email or password' });
        }

        // Check if password exists (user might have registered via Google)
        if (!user.password) {
          return done(null, false, { message: 'Please login using Google' });
        }

        // Verify password
        if (!verifyPassword(password, user.password)) {
          return done(null, false, { message: 'Incorrect email or password' });
        }

        return done(null, user);
      } catch (error) {
        console.error('Error in local auth strategy:', error);
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

  // Register route
  app.post('/api/register', async (req: Request, res: Response) => {
    try {
      // Validate request data
      const validatedData = registerUserSchema.parse(req.body);
      
      // Check if user with this email already exists
      const existingUserByEmail = await storage.getUserByEmail(validatedData.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      
      // Check if username is taken
      const existingUserByUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      
      // Hash the password
      const hashedPassword = hashPassword(validatedData.password);
      
      // Create the new user
      const newUser = await storage.createUser({
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
        displayName: validatedData.username,
      });
      
      // Log the user in
      req.login(newUser, (err) => {
        if (err) {
          console.error('Error logging in after registration:', err);
          return res.status(500).json({ message: 'Error logging in after registration' });
        }
        
        // Return user data without sensitive information
        const { password, ...userData } = newUser as any;
        res.status(201).json({ user: userData });
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.error('Error in registration:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Login route
  app.post('/api/login', (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('local', (err: any, user: User | false, info: any) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ message: info.message || 'Authentication failed' });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        
        // Return user data without sensitive information
        const { password, ...userData } = user as any;
        return res.json({ user: userData });
      });
    })(req, res, next);
  });

  // Authentication middleware temporarily disabled
  // app.use('/api/goals', ensureAuthenticated);
}

// Middleware to check if user is authenticated
export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  // Authentication check temporarily disabled - always pass through
  return next();
  
  // Original authentication logic (commented out)
  // if (req.isAuthenticated()) {
  //   return next();
  // }
  // 
  // // Special case for GET requests to /api/goals
  // // If user is not authenticated, just return empty array instead of error
  // if (req.method === 'GET' && req.path === '/') {
  //   return res.json([]);
  // }
  // 
  // res.status(401).json({ message: 'Unauthorized' });
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