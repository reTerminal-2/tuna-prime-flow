import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'LOGIN'
    | 'LOGOUT'
    | 'AI_ACTION'
    | 'SYSTEM_EVENT';

export type EntityType =
    | 'product'
    | 'supplier'
    | 'pricing_rule'
    | 'settings'
    | 'store_settings'
    | 'order'
    | 'transaction'
    | 'stock_adjustment'
    | 'profile'
    | 'learned_pattern'
    | 'user';

export const auditService = {
    /**
     * Log a user activity to the audit_logs table
     */
    log: async (params: {
        action: AuditAction;
        entityType: EntityType;
        entityId?: string;
        oldValues?: any;
        newValues?: any;
    }) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase.from('audit_logs').insert({
                user_id: user?.id || null,
                action: params.action,
                entity_type: params.entityType,
                entity_id: params.entityId || null,
                old_values: params.oldValues || null,
                new_values: params.newValues || null,
                user_agent: window.navigator.userAgent,
                // IP address is handled by Supabase/PostgreSQL if configured, 
                // but we can't easily get it here without an external service.
            });

            if (error) {
                console.warn("Failed to save audit log:", error.message);
            }
        } catch (err) {
            console.error("Audit Service Error:", err);
        }
    }
};
