import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Fish, Eye, EyeOff } from "lucide-react";
import { z } from "zod";

// Validation schemas
const loginSchema = z.object({
  email: z.string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be less than 100 characters"),
});

const signupSchema = z.object({
  fullName: z.string()
    .trim()
    .min(1, "Full name is required")
    .max(100, "Name must be less than 100 characters"),
  email: z.string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be less than 100 characters"),
  role: z.enum(["user", "admin"]), // user = buyer, admin = seller
});

const REMEMBER_ME_KEY = "tuna_inventory_remember_email";

const Auth = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({ email: "", password: "", fullName: "", role: "user" as "user" | "admin" });
  const [rememberMe, setRememberMe] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [resetEmail, setResetEmail] = useState("");
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const hasNavigatedRef = useRef(false);

  const [searchParams] = useSearchParams();

  // Load saved email on mount
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem(REMEMBER_ME_KEY);
      if (savedEmail) {
        setLoginData(prev => ({ ...prev, email: savedEmail }));
        setRememberMe(true);
      }
    } catch (error) {
      console.error("Error loading saved email:", error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('Auth page - state changed:', event, !!session);

        if (session && event !== 'SIGNED_OUT' && !hasNavigatedRef.current) {
          hasNavigatedRef.current = true;

          const returnUrl = searchParams.get("returnUrl");
          if (returnUrl) {
            navigate(returnUrl, { replace: true });
          } else {
            // Smart Redirect: Check if seller
            const role = session.user.user_metadata?.role;
            if (role === 'admin') {
              navigate("/seller/dashboard", { replace: true });
            } else {
              supabase
                .from("store_settings")
                .select("id")
                .eq("user_id", session.user.id)
                .maybeSingle()
                .then(({ data }) => {
                  if (data) navigate("/seller/dashboard", { replace: true });
                  else navigate("/", { replace: true });
                });
            }
          }

          setTimeout(() => {
            hasNavigatedRef.current = false;
          }, 100);
        }
        setIsCheckingAuth(false);
      }
    );

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;

      if (session && !hasNavigatedRef.current) {
        hasNavigatedRef.current = true;
        const returnUrl = searchParams.get("returnUrl");
        if (returnUrl) {
          navigate(returnUrl, { replace: true });
        } else {
          navigate("/", { replace: true });
        }
        setTimeout(() => {
          hasNavigatedRef.current = false;
        }, 100);
      }
      setIsCheckingAuth(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input
    try {
      loginSchema.parse(loginData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginData.email.trim(),
        password: loginData.password,
      });

      if (error) throw error;

      // Handle remember me
      try {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_ME_KEY, loginData.email.trim());
        } else {
          localStorage.removeItem(REMEMBER_ME_KEY);
        }
      } catch (storageError) {
        console.error("Error saving remember me preference:", storageError);
      }

      toast.success("Login successful!");
      // Navigation will be handled by onAuthStateChange
    } catch (error: any) {
      const errorMsg = error.message || "Login failed";

      // Provide user-friendly error messages
      if (errorMsg.includes("Invalid login credentials")) {
        toast.error("Incorrect email or password. Please check your credentials and try again.");
      } else if (errorMsg.includes("Email not confirmed")) {
        toast.error("Please check your email to verify your account.");
      } else if (errorMsg.includes("User not found")) {
        toast.error("No account found with this email. Please sign up first.");
      } else {
        toast.error("Unable to log in. Please check your email and password.");
      }
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input
    try {
      signupSchema.parse(signupData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setIsLoading(true);

    try {
      // Redirect
      const returnUrl = searchParams.get("returnUrl");
      const redirectUrl = returnUrl ? `${window.location.origin}${returnUrl}` : `${window.location.origin}/`;

      const { data: authData, error } = await supabase.auth.signUp({
        email: signupData.email.trim(),
        password: signupData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: signupData.fullName.trim(),
            role: signupData.role, // Metadata role
          },
        },
      });

      if (error) throw error;

      setLoginData(prev => ({ ...prev, email: signupData.email }));
      setActiveTab("login");
      toast.success("Account created! Please log in with your password.");
      setIsLoading(false);
    } catch (error: any) {
      const errorMsg = error.message || "Signup failed";

      // Provide user-friendly error messages
      if (errorMsg.includes("already registered") || errorMsg.includes("already exists")) {
        toast.error("This email is already registered. Please log in or use a different email.");
      } else if (errorMsg.includes("invalid email")) {
        toast.error("Please enter a valid email address.");
      } else if (errorMsg.includes("Password")) {
        toast.error("Password must be at least 6 characters long.");
      } else {
        toast.error("Unable to create account. Please try again or contact support.");
      }
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error("Please enter your email address");
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;

      toast.success("Password reset link sent! Check your email.");
      setIsResetOpen(false);
      setResetEmail("");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
    } finally {
      setResetLoading(false);
    }
  };


  if (isCheckingAuth) {
    return null;
  }

  return (
    <div className="min-h-screen flex w-full">
      {/* Left Side - Branding/Hero */}
      <div className="hidden lg:flex w-1/2 bg-primary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1544551763-46a8723ba3f9?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
        <div className="relative z-10 text-primary-foreground max-w-lg space-y-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Fish className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">TunaFlow</h1>
          </div>
          <h2 className="text-3xl font-semibold leading-tight">
            The Ultimate Inventory Management for Seafood Businesses
          </h2>
          <p className="text-lg text-primary-foreground/80">
            Streamline your operations with our professional seller center. Track inventory, manage pricing rules, and analyze performance in real-time.
          </p>
          <div className="flex gap-4 pt-4">
            <div className="flex flex-col">
              <span className="text-3xl font-bold">100%</span>
              <span className="text-sm opacity-80">Freshness Guaranteed</span>
            </div>
            <div className="w-px bg-white/20"></div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold">24/7</span>
              <span className="text-sm opacity-80">Real-time Monitoring</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-12 bg-background">
        <Card className="w-full max-w-md shadow-none border-0 sm:border sm:shadow-lg">
          <CardHeader className="space-y-1 text-center lg:text-left">
            <div className="flex justify-center lg:justify-start mb-4 lg:hidden">
              <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                <Fish className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-primary">
              {activeTab === "login" ? "Welcome Back" : "Create Account"}
            </CardTitle>
            <CardDescription>
              {activeTab === "login"
                ? "Sign in to access your account"
                : "Enter your details to create a new account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Enter your email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                      maxLength={255}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                        maxLength={100}
                        autoComplete="current-password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        aria-label={showLoginPassword ? "Hide password" : "Show password"}
                      >
                        {showLoginPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember-me"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      />
                      <Label
                        htmlFor="remember-me"
                        className="text-sm font-normal cursor-pointer select-none"
                      >
                        Remember me
                      </Label>
                    </div>

                    <Button
                      type="button"
                      variant="link"
                      className="px-0 font-normal text-xs"
                      onClick={() => setIsResetOpen(true)}
                    >
                      Forgot password?
                    </Button>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Log In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={signupData.fullName}
                      onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                      required
                      maxLength={100}
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      required
                      maxLength={255}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? "text" : "password"}
                        placeholder="Create a password (min 6 characters)"
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        required
                        minLength={6}
                        maxLength={100}
                        autoComplete="new-password"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        aria-label={showSignupPassword ? "Hide password" : "Show password"}
                      >
                        {showSignupPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-role">I am a...</Label>
                    <select
                      id="signup-role"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={signupData.role}
                      onChange={(e) => setSignupData({ ...signupData, role: e.target.value as "user" | "admin" })}
                    >
                      <option value="user">Customer (I want to buy tuna)</option>
                      <option value="admin">Seller (I want to sell tuna)</option>
                    </select>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="Enter your email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={resetLoading}>
              {resetLoading ? "Sending Link..." : "Send Reset Link"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
