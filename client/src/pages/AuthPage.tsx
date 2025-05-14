import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Redirect } from 'wouter';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

const registerSchema = z.object({
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

const AuthPage: React.FC = () => {
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onLoginSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  const onRegisterSubmit = (values: RegisterFormValues) => {
    // Remove confirmPassword as it's not needed in the API call
    const { confirmPassword, ...registerData } = values;
    registerMutation.mutate(registerData);
  };

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-2 sm:p-4">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-6 md:gap-8 items-center">
        {/* Hero Section */}
        <div className="space-y-6 hidden md:block">
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              TaskBreaker
            </span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Break down your complex goals into simple, actionable tasks.
          </p>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary">✓</span>
              </div>
              <p>AI-powered task breakdown</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary">✓</span>
              </div>
              <p>Time estimation for better planning</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary">✓</span>
              </div>
              <p>Personalized AI coach for motivation</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary">✓</span>
              </div>
              <p>Multi-device access with your account</p>
            </div>
          </div>
        </div>

        {/* Mobile Hero - Compact version for mobile */}
        <div className="space-y-4 md:hidden text-center mb-4">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              TaskBreaker
            </span>
          </h1>
          <p className="text-sm text-muted-foreground px-4">
            Break down your goals into simple, actionable tasks
          </p>
          <div className="flex flex-wrap justify-center gap-2 px-2">
            <div className="flex items-center bg-primary/5 rounded-full px-3 py-1">
              <span className="text-primary mr-1 text-xs">✓</span>
              <p className="text-xs">AI task breakdown</p>
            </div>
            <div className="flex items-center bg-primary/5 rounded-full px-3 py-1">
              <span className="text-primary mr-1 text-xs">✓</span>
              <p className="text-xs">Time estimation</p>
            </div>
            <div className="flex items-center bg-primary/5 rounded-full px-3 py-1">
              <span className="text-primary mr-1 text-xs">✓</span>
              <p className="text-xs">AI coach</p>
            </div>
          </div>
        </div>

        {/* Auth Forms */}
        <Card className="w-full max-w-md mx-auto shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl sm:text-2xl text-center">
              <span className="block">Welcome</span>
            </CardTitle>
            <CardDescription className="text-center text-sm">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
                <CardContent className="space-y-3 pt-3 px-3 sm:px-6">
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-sm">Email</Label>
                    <Input
                      id="email"
                      placeholder="your.email@example.com"
                      className="h-9 text-sm"
                      {...loginForm.register('email')}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{loginForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="password" className="text-sm">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="h-9 text-sm"
                      {...loginForm.register('password')}
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="px-3 sm:px-6 pb-4">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register">
              <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)}>
                <CardContent className="space-y-3 pt-3 px-3 sm:px-6">
                  <div className="space-y-1">
                    <Label htmlFor="username" className="text-sm">Username</Label>
                    <Input
                      id="username"
                      placeholder="johndoe"
                      className="h-9 text-sm"
                      {...registerForm.register('username')}
                    />
                    {registerForm.formState.errors.username && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.username.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email" className="text-sm">Email</Label>
                    <Input
                      id="email"
                      placeholder="your.email@example.com"
                      className="h-9 text-sm"
                      {...registerForm.register('email')}
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="password" className="text-sm">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="h-9 text-sm"
                      {...registerForm.register('password')}
                    />
                    {registerForm.formState.errors.password && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="confirmPassword" className="text-sm">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      className="h-9 text-sm"
                      {...registerForm.register('confirmPassword')}
                    />
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-xs text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="px-3 sm:px-6 pb-4">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? 'Creating account...' : 'Create Account'}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;