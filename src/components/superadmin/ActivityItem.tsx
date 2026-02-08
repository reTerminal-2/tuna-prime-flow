import { formatDistanceToNow } from "date-fns";
import { ShoppingCart, TrendingUp, Package } from "lucide-react";

interface ActivityItemProps {
    type: 'order' | 'transaction';
    title: string;
    subtitle: string;
    amount: number;
    timestamp: string;
    status?: string;
}

export function ActivityItem({ type, title, subtitle, amount, timestamp, status }: ActivityItemProps) {
    const Icon = type === 'order' ? ShoppingCart : TrendingUp;
    const iconColor = type === 'order' ? 'text-blue-500' : 'text-green-500';
    const bgColor = type === 'order' ? 'bg-blue-500/10' : 'bg-green-500/10';

    const statusColors: Record<string, string> = {
        'pending': 'text-yellow-500',
        'processing': 'text-blue-500',
        'shipped': 'text-purple-500',
        'delivered': 'text-green-500',
        'cancelled': 'text-red-500'
    };

    return (
        <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
            <div className={`p-2 ${bgColor} rounded-lg`}>
                <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{title}</p>
                <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            </div>
            <div className="text-right">
                <p className="text-sm font-semibold">₱{amount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
                </p>
            </div>
        </div>
    );
}
