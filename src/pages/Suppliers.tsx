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
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplier = async () => {
    try {
      const { error } = await supabase.from("suppliers").insert([
        {
          name: newSupplier.name,
          contact_person: newSupplier.contact_person || null,
          email: newSupplier.email || null,
          phone: newSupplier.phone || null,
          address: newSupplier.address || null,
          notes: newSupplier.notes || null,
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
      toast.error(error.message || "Failed to add supplier");
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
      toast.error(error.message || "Failed to delete supplier");
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
