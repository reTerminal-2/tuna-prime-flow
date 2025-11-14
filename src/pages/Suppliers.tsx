import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Users as UsersIcon } from "lucide-react";
import { z } from "zod";

const supplierSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  contact_person: z.string().trim().max(100, "Contact person must be less than 100 characters").optional().or(z.literal('')),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters").optional().or(z.literal('')),
  phone: z.string().trim().max(20, "Phone must be less than 20 characters").optional().or(z.literal('')),
  address: z.string().trim().max(500, "Address must be less than 500 characters").optional().or(z.literal('')),
  notes: z.string().trim().max(1000, "Notes must be less than 1000 characters").optional().or(z.literal('')),
});

interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
}

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name");

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      toast.error("Unable to load suppliers. Please refresh the page or check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplier = async () => {
    try {
      // Validate input
      const validationResult = supplierSchema.safeParse({
        name: newSupplier.name,
        contact_person: newSupplier.contact_person,
        email: newSupplier.email,
        phone: newSupplier.phone,
        address: newSupplier.address,
        notes: newSupplier.notes,
      });

      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(e => e.message).join(", ");
        toast.error(errors);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to add suppliers");
        return;
      }

      const { error } = await supabase.from("suppliers").insert([
        {
          name: validationResult.data.name,
          contact_person: validationResult.data.contact_person || null,
          email: validationResult.data.email || null,
          phone: validationResult.data.phone || null,
          address: validationResult.data.address || null,
          notes: validationResult.data.notes || null,
          user_id: user.id,
        },
      ]);

      if (error) throw error;

      toast.success("Supplier added successfully");
      setIsAddDialogOpen(false);
      setNewSupplier({
        name: "",
        contact_person: "",
        email: "",
        phone: "",
        address: "",
        notes: "",
      });
      fetchSuppliers();
    } catch (error: any) {
      console.error("Error adding supplier:", error);
      const errorMsg = error.message || "";
      
      if (errorMsg.includes("duplicate key") || errorMsg.includes("already exists")) {
        toast.error("A supplier with this name already exists. Please use a different name.");
      } else if (errorMsg.includes("violates row-level security")) {
        toast.error("You don't have permission to add suppliers. Please log in again.");
      } else if (errorMsg.includes("invalid email")) {
        toast.error("Please enter a valid email address for the supplier.");
      } else {
        toast.error("Unable to add supplier. Please check all fields and try again.");
      }
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);

      if (error) throw error;

      toast.success("Supplier deleted successfully");
      fetchSuppliers();
    } catch (error: any) {
      console.error("Error deleting supplier:", error);
      const errorMsg = error.message || "";
      
      if (errorMsg.includes("foreign key") || errorMsg.includes("still referenced")) {
        toast.error("Cannot delete this supplier because some products are linked to them. Please update or remove those products first.");
      } else if (errorMsg.includes("permission")) {
        toast.error("You don't have permission to delete this supplier.");
      } else {
        toast.error("Unable to delete supplier. Please try again.");
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Suppliers</h1>
          <p className="text-muted-foreground">
            Manage your supplier information and contacts
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Supplier</DialogTitle>
              <DialogDescription>
                Enter the supplier's contact information
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="supplier-name">Supplier Name</Label>
                <Input
                  id="supplier-name"
                  value={newSupplier.name}
                  onChange={(e) =>
                    setNewSupplier({ ...newSupplier, name: e.target.value })
                  }
                  placeholder="Pacific Tuna Co."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-person">Contact Person</Label>
                  <Input
                    id="contact-person"
                    value={newSupplier.contact_person}
                    onChange={(e) =>
                      setNewSupplier({
                        ...newSupplier,
                        contact_person: e.target.value,
                      })
                    }
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newSupplier.email}
                    onChange={(e) =>
                      setNewSupplier({ ...newSupplier, email: e.target.value })
                    }
                    placeholder="contact@supplier.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newSupplier.phone}
                    onChange={(e) =>
                      setNewSupplier({ ...newSupplier, phone: e.target.value })
                    }
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={newSupplier.address}
                    onChange={(e) =>
                      setNewSupplier({ ...newSupplier, address: e.target.value })
                    }
                    placeholder="123 Ocean Drive"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newSupplier.notes}
                  onChange={(e) =>
                    setNewSupplier({ ...newSupplier, notes: e.target.value })
                  }
                  placeholder="Additional notes about the supplier"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddSupplier}>Add Supplier</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {suppliers.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center">
              <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                No suppliers yet. Add your first supplier to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          suppliers.map((supplier) => (
            <Card key={supplier.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{supplier.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteSupplier(supplier.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardTitle>
                {supplier.contact_person && (
                  <CardDescription>{supplier.contact_person}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {supplier.email && (
                  <div>
                    <span className="text-muted-foreground">Email: </span>
                    <span>{supplier.email}</span>
                  </div>
                )}
                {supplier.phone && (
                  <div>
                    <span className="text-muted-foreground">Phone: </span>
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.address && (
                  <div>
                    <span className="text-muted-foreground">Address: </span>
                    <span>{supplier.address}</span>
                  </div>
                )}
                {supplier.notes && (
                  <div className="pt-2 border-t">
                    <span className="text-muted-foreground">Notes: </span>
                    <p className="text-muted-foreground">{supplier.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Suppliers;
