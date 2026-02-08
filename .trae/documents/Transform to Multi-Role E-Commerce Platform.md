I will transform the application into a multi-role e-commerce platform with a Customer Storefront and a Seller Dashboard.

1. **Phase 1: Database & Role Architecture (Preparation)**

   * **User Roles**: I will use the existing `user_roles` table (which has `admin` and `user`) to distinguish between Sellers (`admin`) and Buyers (`user`).

   * **Orders Table**: I will create a new `orders` table (simulated via `transactions` or a new structure if RLS allows) to handle customer orders separate from internal inventory logs. *Note: Since I cannot run SQL migrations directly, I will adapt the existing* *`transactions`* *table to serve as "Orders" by adding a* *`status`* *field (pending, shipped, delivered) via code if possible, or use metadata.*

2. **Phase 2: Routing Restructuring**

   * I will refactor `App.tsx` to separate routes:

     * **Storefront Routes (`/`)**:

       * `/`: Home Page (Product Listing)

       * `/product/:id`: Product Details

       * `/cart`: Shopping Cart

       * `/checkout`: Checkout Page

       * `/orders`: Customer Order History

     * **Seller Routes (`/seller/*`)**:

       * Move existing dashboard pages to `/seller/dashboard`, `/seller/inventory`, etc.

       * Protect these routes so only "Sellers" (admins) can access them.

3. **Phase 3: Storefront Implementation**

   * **Navbar**: Create a `StoreNavbar` for customers (Search, Cart, Profile) separate from the `Sidebar` used by sellers.

   * **Home Page**: Display a grid of products with "Add to Cart" buttons.

   * **Product Details**: Show full details, images, and stock status.

   * **Cart System**: Implement a simple local-storage based cart (or database-backed if user is logged in).

4. **Phase 4: Seller Dashboard Updates**

   * Update the `MainLayout` to include a link to "View Store".

   * Ensure the `Dashboard` shows "Incoming Orders" (derived from the new order logic).

5. **Phase 5: Authentication Update**

   * Update `Auth.tsx` to allow users to sign up as either a "Buyer" or "Seller" (or default to Buyer, with a specific admin invite for Sellers).

**Execution Order:**

1. **Refactor Routing**: Move existing pages to `/seller` path.
2. **Create Store Layout**: Build the public-facing header/layout.
3. **Build Storefront Pages**: Home, Product Detail, Cart.
4. **Connect Order Flow**: Allow Buyers to create entries in `transactions` (Orders).

