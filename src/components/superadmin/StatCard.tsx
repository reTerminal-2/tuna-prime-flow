import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: string;
    iconColor?: string;
}

export function StatCard({ title, value, icon: Icon, trend, iconColor = "text-blue-500" }: StatCardProps) {
    return (
        <Card className="bg-card border-border hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <p className="text-3xl font-bold tracking-tight">{value}</p>
                        {trend && (
                            <p className="text-xs text-muted-foreground mt-1">{trend}</p>
                        )}
                    </div>
                    <div className={`p-3 bg-primary/10 rounded-xl`}>
                        <Icon className={`w-6 h-6 ${iconColor}`} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
