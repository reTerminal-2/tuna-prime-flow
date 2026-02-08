
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Lock } from "lucide-react";

export default function SuperAdminLogin() {
    const [pin, setPin] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        // Force dark mode for this page
        document.documentElement.classList.add("dark");
    }, []);

    const handleLogin = () => {
        if (pin === "0425") {
            sessionStorage.setItem("superAdminAuth", "true");
            toast.success("Access Granted");
            navigate("/superadmin/dashboard");
        } else {
            toast.error("Invalid PIN");
            setPin("");
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-foreground">
            <div className="w-full max-w-md space-y-8 text-center">
                <div className="flex flex-col items-center gap-2">
                    <div className="p-3 bg-primary/10 rounded-full">
                        <Lock className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tighter">Super Admin</h1>
                    <p className="text-muted-foreground">Enter secure PIN to access unrestricted controls</p>
                </div>

                <div className="flex flex-col items-center gap-6">
                    <InputOTP
                        maxLength={4}
                        value={pin}
                        onChange={(value) => setPin(value)}
                    >
                        <InputOTPGroup className="gap-2">
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                        </InputOTPGroup>
                    </InputOTP>

                    <Button
                        className="w-full max-w-xs"
                        onClick={handleLogin}
                        disabled={pin.length !== 4}
                    >
                        Enter Panel
                    </Button>
                </div>
            </div>
        </div>
    );
}
