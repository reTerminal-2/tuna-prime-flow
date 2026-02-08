import { supabase } from "@/integrations/supabase/client";

export interface UserStats {
    totalUsers: number;
    newUsersLast7Days: number;
    activeCustomers: number;
}

export interface DatabaseStats {
    totalProducts: number;
    totalOrders: number;
    totalTransactions: number;
    totalSuppliers: number;
}

export interface ActivityItem {
    id: string;
    type: 'order' | 'transaction';
    title: string;
    subtitle: string;
    amount: number;
    timestamp: string;
    status?: string;
}

export interface SystemHealth {
    database: 'connected' | 'disconnected';
    aiCore: 'online' | 'offline';
}

/**
 * Fetch user statistics for the dashboard
 */
export async function fetchUserStats(): Promise<UserStats> {
    try {
        // Get total users
        const { count: totalUsers } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        // Get users from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { count: newUsersLast7Days } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', sevenDaysAgo.toISOString());

        // Get active customers (users with at least one order)
        const { data: customersData } = await supabase
            .from('orders')
            .select('user_id', { count: 'exact' });

        const uniqueCustomers = new Set(customersData?.map(o => o.user_id) || []);
        const activeCustomers = uniqueCustomers.size;

        return {
            totalUsers: totalUsers || 0,
            newUsersLast7Days: newUsersLast7Days || 0,
            activeCustomers
        };
    } catch (error) {
        console.error('Error fetching user stats:', error);
        return {
            totalUsers: 0,
            newUsersLast7Days: 0,
            activeCustomers: 0
        };
    }
}

/**
 * Fetch database statistics for all major tables
 */
export async function fetchDatabaseStats(): Promise<DatabaseStats> {
    try {
        const [products, orders, transactions, suppliers] = await Promise.all([
            supabase.from('products').select('*', { count: 'exact', head: true }),
            supabase.from('orders').select('*', { count: 'exact', head: true }),
            supabase.from('transactions').select('*', { count: 'exact', head: true }),
            supabase.from('suppliers').select('*', { count: 'exact', head: true })
        ]);

        return {
            totalProducts: products.count || 0,
            totalOrders: orders.count || 0,
            totalTransactions: transactions.count || 0,
            totalSuppliers: suppliers.count || 0
        };
    } catch (error) {
        console.error('Error fetching database stats:', error);
        return {
            totalProducts: 0,
            totalOrders: 0,
            totalTransactions: 0,
            totalSuppliers: 0
        };
    }
}

/**
 * Fetch recent activity (orders and transactions)
 */
export async function fetchRecentActivity(): Promise<ActivityItem[]> {
    try {
        const activities: ActivityItem[] = [];

        // Fetch recent orders
        const { data: orders } = await supabase
            .from('orders')
            .select('id, status, total_amount, created_at, user_id, profiles(full_name)')
            .order('created_at', { ascending: false })
            .limit(5);

        if (orders) {
            orders.forEach(order => {
                const userName = (order as any).profiles?.full_name || 'Unknown User';
                activities.push({
                    id: order.id,
                    type: 'order',
                    title: `Order #${order.id.slice(0, 8)}`,
                    subtitle: `${userName} • ${order.status}`,
                    amount: order.total_amount,
                    timestamp: order.created_at,
                    status: order.status
                });
            });
        }

        // Fetch recent transactions
        const { data: transactions } = await supabase
            .from('transactions')
            .select('id, total_amount, transaction_date, product_id, products(name)')
            .order('transaction_date', { ascending: false })
            .limit(5);

        if (transactions) {
            transactions.forEach(txn => {
                const productName = (txn as any).products?.name || 'Unknown Product';
                activities.push({
                    id: txn.id,
                    type: 'transaction',
                    title: `Transaction #${txn.id.slice(0, 8)}`,
                    subtitle: productName,
                    amount: txn.total_amount,
                    timestamp: txn.transaction_date
                });
            });
        }

        // Sort all activities by timestamp
        return activities.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ).slice(0, 10);

    } catch (error) {
        console.error('Error fetching recent activity:', error);
        return [];
    }
}

/**
 * Check database health by attempting a simple query
 */
export async function checkDatabaseHealth(): Promise<SystemHealth> {
    try {
        const { error } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .limit(1);

        return {
            database: error ? 'disconnected' : 'connected',
            aiCore: 'online' // Placeholder - would need actual AI core check
        };
    } catch (error) {
        console.error('Error checking database health:', error);
        return {
            database: 'disconnected',
            aiCore: 'offline'
        };
    }
}
