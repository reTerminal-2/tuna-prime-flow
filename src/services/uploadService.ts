import { supabase } from "@/integrations/supabase/client";

/**
 * Upload Service
 * Centralized logic for handling image uploads.
 * Supports Supabase Storage and provides a hook for VPS-based storage.
 */
export const uploadService = {
    /**
     * Upload an image to the configured storage provider.
     * @param file The file object to upload
     * @param bucket The Supabase bucket name (default: 'avatars')
     * @param path The path within the bucket
     */
    async uploadImage(file: File, bucket: string = 'avatars', path: string = ''): Promise<string> {
        // 1. Check if VPS upload is configured via environment variable
        const vpsUploadUrl = import.meta.env.VITE_UPLOAD_API;

        if (vpsUploadUrl) {
            return this.uploadToVps(file, vpsUploadUrl);
        }

        // 2. Default: Upload to Supabase
        return this.uploadToSupabase(file, bucket, path);
    },

    /**
     * Internal method for Supabase uploads
     */
    async uploadToSupabase(file: File, bucket: string, path: string): Promise<string> {
        try {
            const fileName = path || `${Date.now()}-${file.name}`;

            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(fileName, file, {
                    upsert: true,
                    cacheControl: '3600'
                });

            if (error) {
                if (error.message.includes('Bucket not found')) {
                    throw new Error(`Storage Error: The bucket "${bucket}" does not exist in your Supabase project. Please create it and set it to Public.`);
                }
                throw error;
            }

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(data.path);

            return publicUrl;
        } catch (error: any) {
            console.error("Supabase upload failed:", error);
            throw error;
        }
    },

    /**
     * Internal method for VPS uploads (Placeholder for user to implement their endpoint)
     */
    async uploadToVps(file: File, url: string): Promise<string> {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                // Add headers if your VPS requires auth (e.g., Bearer token)
                /* headers: {
                  'Authorization': `Bearer ${token}`
                } */
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `VPS Upload failed with status ${response.status}`);
            }

            const data = await response.json();
            return data.url; // Assumes your VPS API returns { url: "https://..." }
        } catch (error: any) {
            console.error("VPS upload failed:", error);
            throw new Error(`VPS Upload Error: ${error.message}. Please ensure your VPS endpoint is correctly configured and handling CORS.`);
        }
    }
};
