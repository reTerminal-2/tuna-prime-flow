import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, Calculator, Sparkles, MessageSquare, PackageOpen, Boxes, UserCircle, Users, Clock, History, MoreVertical, Receipt, XCircle, PauseCircle, Tag, Settings, LogOut, Package } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { aiService, ChatResponse } from "@/services/aiService";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  current_stock: number;
  selling_price: number;
  unit_of_measure: string;
}

interface CartItem extends Product {
  qty: number;
  isPack?: boolean;
  packName?: string;
  discount?: number; // percentage
}

interface Customer {
    id: string;
    full_name: string;
    email?: string;
}

export default function POS() {
  // Add debug logs to verify mounting
  useEffect(() => {
      console.log("POS Component Mounted");
  }, []);

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [heldOrders, setHoldOrders] = useState<{customer: string, date: Date, items: CartItem[]}[]>([]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Shift State
  const [isShiftOpen, setIsShiftOpen] = useState(() => {
      try {
          const saved = localStorage.getItem('pos_shift');
          return !!saved;
      } catch {
          return false;
      }
  });
  const [shiftData, setShiftData] = useState<any>(() => {
      try {
          const saved = localStorage.getItem('pos_shift');
          return saved ? JSON.parse(saved) : null;
      } catch {
          return null;
      }
  });
  const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(!isShiftOpen);
  const [startingCash, setStartingCash] = useState("");

  // Dialogs
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'card'|'gcash'>('cash');
  const [amountTendered, setAmountTendered] = useState("");
  
  // AI & Calculator State
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState("");
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .gt('current_stock', 0)
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error("Error fetching products:", err);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
      const { data } = await supabase.from('customers').select('id, full_name, email').limit(50);
      if (data) setCustomers(data);
  };

  const addToCart = (product: Product, packMultiplier = 1, packName?: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id && item.isPack === (packMultiplier > 1));
      
      if (existing) {
        if (existing.qty + packMultiplier > product.current_stock) {
            toast.error("Not enough stock!");
            return prev;
        }
        return prev.map(item => (item.id === product.id && item.isPack === (packMultiplier > 1)) ? { ...item, qty: item.qty + packMultiplier } : item);
      }
      
      return [...prev, { ...product, qty: packMultiplier, isPack: packMultiplier > 1, packName }];
    });
    if (packMultiplier > 1) toast.success(`Added ${packName}`);
  };

  const updateQty = (id: string, delta: number, isPack: boolean) => {
    setCart(prev => {
        return prev.map(item => {
            if (item.id === id && !!item.isPack === isPack) {
                const newQty = item.qty + delta;
                if (newQty <= 0) return null;
                if (delta > 0 && newQty > item.current_stock) {
                    toast.error("Max stock reached");
                    return item;
                }
                return { ...item, qty: newQty };
            }
            return item;
        }).filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (id: string, isPack: boolean) => {
    setCart(prev => prev.filter(item => !(item.id === id && !!item.isPack === isPack)));
  };

  const clearCart = () => {
      setCart([]);
      setSelectedCustomer(null);
      setAmountTendered("");
  };

  const holdOrder = () => {
      if (cart.length === 0) return;
      setHoldOrders(prev => [...prev, { 
          customer: selectedCustomer?.full_name || "Walk-in", 
          date: new Date(), 
          items: [...cart] 
      }]);
      clearCart();
      toast.success("Order placed on hold");
  };

  const restoreOrder = (index: number) => {
      const order = heldOrders[index];
      setCart(order.items);
      // Try to find customer
      const cust = customers.find(c => c.full_name === order.customer);
      setSelectedCustomer(cust || null);
      
      setHoldOrders(prev => prev.filter((_, i) => i !== index));
      setIsHistoryOpen(false);
      toast.success("Order restored");
  };

  const filteredProducts = products.filter(p => {
    const name = p.name || "";
    const sku = p.sku || "";
    const category = p.category || "uncategorized";
    
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Totals
  const subtotal = cart.reduce((sum, item) => sum + (item.selling_price * item.qty), 0);
  const totalDiscount = cart.reduce((sum, item) => sum + (item.selling_price * item.qty * ((item.discount || 0)/100)), 0);
  const tax = (subtotal - totalDiscount) * 0.12; // 12% VAT mock
  const grandTotal = subtotal - totalDiscount;

  const handleCheckout = async () => {
      if (cart.length === 0) return;
      
      // Save order to DB (Mock)
      toast.success(`Processed Payment: ₱${grandTotal.toFixed(2)}`);
      
      // Update Stock (Optimistic UI)
      // In real app, we'd wait for DB confirmation
      setProducts(prev => prev.map(p => {
          const inCart = cart.find(c => c.id === p.id);
          if (inCart) return { ...p, current_stock: p.current_stock - inCart.qty };
          return p;
      }));

      setIsPaymentOpen(false);
      clearCart();
  };

  const handleOpenShift = () => {
      const shift = {
          startTime: new Date(),
          startingCash: parseFloat(startingCash) || 0,
          cashier: "Admin" 
      };
      localStorage.setItem('pos_shift', JSON.stringify(shift));
      setShiftData(shift);
      setIsShiftOpen(true);
      setIsShiftDialogOpen(false);
      toast.success("Shift opened");
  };

  const handleCloseShift = () => {
      localStorage.removeItem('pos_shift');
      setIsShiftOpen(false);
      setShiftData(null);
      setIsShiftDialogOpen(true); 
      toast.info("Shift closed");
  };

  const applyDiscount = () => {
      const val = parseFloat(discountValue);
      if (!val || val < 0) return;
      
      setCart(prev => prev.map(item => {
          let disc = 0;
          if (discountType === 'percent') {
              disc = val; 
          } else {
              disc = (val / item.selling_price) * 100;
          }
          return { ...item, discount: disc };
      }));
      setIsDiscountOpen(false);
      toast.success("Discount applied");
  };

  // --- CALCULATOR LOGIC ---
  const handleCalcPress = (val: string) => {
      if (val === 'C') {
          setCalcDisplay("");
      } else if (val === '=') {
          try {
               
              setCalcDisplay(eval(calcDisplay).toString());
          } catch {
              setCalcDisplay("Error");
          }
      } else {
          setCalcDisplay(prev => prev + val);
      }
  };

  // --- AI LOGIC ---
  const handleAskAI = async () => {
      if (!aiMessage.trim()) return;
      setAiLoading(true);
      setAiResponse(null);

      try {
          const context = {
              products: products,
              orders: [],
              customers: customers,
              cart: cart,
              shift: shiftData
          };
          
          const response = await aiService.chatWithAI(aiMessage, context);
          setAiResponse(response.message);
          
          if (response.proposedAction) {
             if (response.proposedAction.type === 'ADD_TO_CART') {
                 const prod = products.find(p => p.id === response.proposedAction!.payload.productId);
                 if (prod) {
                     addToCart(prod, response.proposedAction!.payload.quantity || 1);
                     toast.success("AI added item to cart");
                 }
             }
          }
      } catch (e) {
          setAiResponse("Sorry, I'm having trouble connecting right now.");
      } finally {
          setAiLoading(false);
      }
  };

  const categories = ["all", ...Array.from(new Set(products.map(p => p.category || "uncategorized")))];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:flex-row gap-4 p-2 lg:p-4 bg-muted/20 relative">
      
      {/* LEFT SIDE: PRODUCT CATALOG */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Top Bar: Search & Customer */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between bg-card p-3 rounded-xl border shadow-sm">
          <div className="flex gap-2 flex-1">
              <div className="relative flex-1">
                 <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                 <Input 
                    placeholder="Search items or scan barcode..." 
                    className="pl-9 bg-background" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    autoFocus
                 />
              </div>
              <Popover>
                  <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[200px] justify-between">
                          {selectedCustomer ? (
                              <span className="flex items-center gap-2"><UserCircle className="h-4 w-4" /> {selectedCustomer.full_name}</span>
                          ) : (
                              <span className="flex items-center gap-2 text-muted-foreground"><Users className="h-4 w-4" /> Walk-in Customer</span>
                          )}
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[250px] p-0" align="end">
                      <div className="p-2 border-b"><Input placeholder="Search customers..." className="h-8" /></div>
                      <ScrollArea className="h-[200px]">
                          <div className="p-1">
                              <Button variant="ghost" className="w-full justify-start text-sm" onClick={() => setSelectedCustomer(null)}>Walk-in Customer</Button>
                              {customers.map(c => (
                                  <Button key={c.id} variant="ghost" className="w-full justify-start text-sm" onClick={() => setSelectedCustomer(c)}>
                                      {c.full_name}
                                  </Button>
                              ))}
                          </div>
                      </ScrollArea>
                  </PopoverContent>
              </Popover>
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                          <MoreVertical className="h-4 w-4" />
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                      <DropdownMenuLabel>System</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setIsShiftDialogOpen(true)}>
                          <Clock className="mr-2 h-4 w-4" /> Shift Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.location.reload()}>
                          <Settings className="mr-2 h-4 w-4" /> Refresh POS
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={handleCloseShift}>
                          <LogOut className="mr-2 h-4 w-4" /> Close Register
                      </DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </div>

        {/* Categories */}
        <div className="bg-card p-2 rounded-xl border shadow-sm overflow-x-auto">
             <div className="flex gap-2 min-w-max">
                {categories.map(cat => (
                    <Button 
                        key={cat} 
                        variant={categoryFilter === cat ? "default" : "outline"}
                        onClick={() => setCategoryFilter(cat)}
                        className="capitalize rounded-full px-6"
                    >
                        {cat}
                    </Button>
                ))}
             </div>
        </div>

        {/* Product Grid */}
        <ScrollArea className="flex-1 rounded-xl border bg-card/50 p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredProducts.map(product => (
                    <Card 
                        key={product.id} 
                        className="group cursor-pointer hover:border-primary transition-all active:scale-95 flex flex-col justify-between overflow-hidden relative shadow-sm hover:shadow-md"
                        onClick={() => addToCart(product)}
                    >
                        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <Button size="icon" variant="secondary" className="h-7 w-7 rounded-full shadow" onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product, 6, "6-Pack");
                            }} title="Add 6-Pack">
                                <Package className="h-3 w-3" />
                            </Button>
                        </div>

                        <div className="h-28 bg-muted/30 flex items-center justify-center text-muted-foreground relative">
                            <span className="text-3xl font-bold opacity-10 select-none">{(product.name || "?").substring(0,2).toUpperCase()}</span>
                            {(product.current_stock || 0) < 10 && (
                                <Badge variant="destructive" className="absolute bottom-2 left-2 text-[10px] h-5">Low Stock</Badge>
                            )}
                        </div>
                        <CardContent className="p-3">
                            <h3 className="font-semibold text-sm line-clamp-2 h-10 leading-tight" title={product.name}>{product.name || "Unknown Product"}</h3>
                            <div className="flex justify-between items-end mt-2">
                                <div>
                                    <div className="text-[10px] text-muted-foreground uppercase">{product.unit_of_measure || 'unit'}</div>
                                    <span className="font-bold text-primary text-lg">₱{product.selling_price || 0}</span>
                                </div>
                                <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">{product.current_stock || 0} left</div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </ScrollArea>
        
        {/* Floating Action Buttons */}
        <div className="absolute bottom-6 left-6 flex gap-2 z-20">
            <Button size="icon" className="h-12 w-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700" onClick={() => setIsCalculatorOpen(true)}>
                <Calculator className="h-6 w-6 text-white" />
            </Button>
            <Button size="icon" className="h-12 w-12 rounded-full shadow-lg bg-purple-600 hover:bg-purple-700" onClick={() => setIsAIChatOpen(true)}>
                <Sparkles className="h-6 w-6 text-white" />
            </Button>
        </div>
      </div>

      {/* RIGHT SIDE: CART (Desktop) */}
      <div className="hidden lg:flex w-[400px] flex-col bg-card border rounded-xl shadow-sm overflow-hidden h-full">
         <div className="p-4 border-b flex justify-between items-center bg-muted/10">
             <div className="font-bold flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Current Order</div>
             <div className="flex gap-1">
                 <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setIsHistoryOpen(true)} title="Held Orders">
                     <History className="h-4 w-4" />
                 </Button>
                 <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={clearCart} disabled={cart.length === 0} title="Clear Cart">
                     <Trash2 className="h-4 w-4" />
                 </Button>
             </div>
         </div>
         
         <CartList cart={cart} updateQty={updateQty} removeFromCart={removeFromCart} />
         
         <CartSummaryFooter 
            subtotal={subtotal} 
            tax={tax} 
            total={grandTotal} 
            cartCount={cart.length}
            onCheckout={() => setIsPaymentOpen(true)} 
            onHold={holdOrder}
            onDiscount={() => setIsDiscountOpen(true)}
         />
      </div>

      {/* MOBILE CART: BOTTOM BAR + SHEET */}
      <div className="lg:hidden fixed bottom-4 left-4 right-4 z-50">
        <Sheet>
            <SheetTrigger asChild>
                <Button size="lg" className="w-full shadow-xl text-lg flex justify-between py-6">
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5" />
                        <span>{cart.reduce((a,c) => a+c.qty, 0)} Items</span>
                    </div>
                    <span className="font-bold">₱{grandTotal.toFixed(2)}</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[90vh] flex flex-col p-0 rounded-t-xl">
                <SheetHeader className="p-4 border-b flex flex-row items-center justify-between">
                    <SheetTitle>Current Order</SheetTitle>
                    <Button variant="ghost" size="sm" onClick={clearCart}>Clear</Button>
                </SheetHeader>
                <CartList cart={cart} updateQty={updateQty} removeFromCart={removeFromCart} />
                <CartSummaryFooter 
                    subtotal={subtotal} 
                    tax={tax} 
                    total={grandTotal} 
                    cartCount={cart.length}
                    onCheckout={() => setIsPaymentOpen(true)} 
                    onHold={holdOrder}
                    onDiscount={() => setIsDiscountOpen(true)}
                />
            </SheetContent>
        </Sheet>
      </div>

      {/* --- DIALOGS --- */}

      {/* Payment Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
          <DialogContent className="sm:max-w-md">
              <DialogHeader>
                  <DialogTitle>Payment</DialogTitle>
                  <DialogDescription>Total Amount Due</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                  <div className="text-center mb-6">
                      <div className="text-4xl font-bold text-primary">₱{grandTotal.toFixed(2)}</div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mb-4">
                      <Button 
                        variant={paymentMethod === 'cash' ? 'default' : 'outline'} 
                        onClick={() => setPaymentMethod('cash')}
                        className="h-16 flex-col gap-1"
                      >
                          <Banknote className="h-5 w-5" /> Cash
                      </Button>
                      <Button 
                        variant={paymentMethod === 'card' ? 'default' : 'outline'} 
                        onClick={() => setPaymentMethod('card')}
                        className="h-16 flex-col gap-1"
                      >
                          <CreditCard className="h-5 w-5" /> Card
                      </Button>
                      <Button 
                        variant={paymentMethod === 'gcash' ? 'default' : 'outline'} 
                        onClick={() => setPaymentMethod('gcash')}
                        className="h-16 flex-col gap-1"
                      >
                          <span className="font-bold text-lg">G</span> GCash
                      </Button>
                  </div>

                  {paymentMethod === 'cash' && (
                      <div className="space-y-4">
                          <div className="space-y-2">
                              <label className="text-sm font-medium">Amount Tendered</label>
                              <Input 
                                type="number" 
                                className="text-right text-lg" 
                                value={amountTendered}
                                onChange={e => setAmountTendered(e.target.value)}
                                autoFocus
                              />
                          </div>
                          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                              <span className="font-medium">Change</span>
                              <span className="text-xl font-bold">
                                  ₱{Math.max(0, (parseFloat(amountTendered) || 0) - grandTotal).toFixed(2)}
                              </span>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                              {[100, 200, 500, 1000].map(amt => (
                                  <Button key={amt} variant="outline" size="sm" onClick={() => setAmountTendered(amt.toString())}>
                                      ₱{amt}
                                  </Button>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPaymentOpen(false)}>Cancel</Button>
                  <Button 
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700" 
                    onClick={handleCheckout}
                    disabled={paymentMethod === 'cash' && (parseFloat(amountTendered) || 0) < grandTotal}
                  >
                      Complete Payment
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* History / Held Orders Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Held Orders</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[300px]">
                  {heldOrders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50 py-10">
                          <PauseCircle className="h-10 w-10 mb-2" />
                          <p>No held orders</p>
                      </div>
                  ) : (
                      <div className="space-y-2">
                          {heldOrders.map((order, idx) => (
                              <div key={idx} className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/50">
                                  <div>
                                      <div className="font-bold">{order.customer}</div>
                                      <div className="text-xs text-muted-foreground">{format(order.date, 'h:mm a')} • {order.items.length} items</div>
                                  </div>
                                  <div className="flex gap-2">
                                      <Button size="sm" variant="secondary" onClick={() => restoreOrder(idx)}>Restore</Button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </ScrollArea>
          </DialogContent>
      </Dialog>

      {/* Calculator Dialog */}
      <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
        <DialogContent className="sm:max-w-xs">
            <DialogHeader><DialogTitle>Quick Calc</DialogTitle></DialogHeader>
            <div className="bg-muted p-4 rounded-lg mb-4 text-right text-2xl font-mono h-12 flex items-center justify-end overflow-hidden">
                {calcDisplay || "0"}
            </div>
            <div className="grid grid-cols-4 gap-2">
                {['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+'].map(btn => (
                    <Button key={btn} variant={btn === '=' ? "default" : "outline"} className="h-12 text-lg font-bold" onClick={() => handleCalcPress(btn)}>
                        {btn}
                    </Button>
                ))}
                <Button variant="destructive" className="col-span-4 mt-2" onClick={() => handleCalcPress('C')}>Clear</Button>
            </div>
        </DialogContent>
      </Dialog>

      {/* Shift Management Dialog */}
      <Dialog open={isShiftDialogOpen} onOpenChange={(open) => { if (isShiftOpen) setIsShiftDialogOpen(open); }}>
          <DialogContent className="sm:max-w-sm" onPointerDownOutside={(e) => !isShiftOpen && e.preventDefault()}>
              <DialogHeader>
                  <DialogTitle>{isShiftOpen ? "Shift Details" : "Open Register"}</DialogTitle>
                  <DialogDescription>
                      {isShiftOpen ? "Current shift session details." : "Enter starting cash amount to begin selling."}
                  </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                  {!isShiftOpen ? (
                      <div className="space-y-2">
                          <label className="text-sm font-medium">Starting Cash Fund (₱)</label>
                          <Input 
                              type="number" 
                              value={startingCash} 
                              onChange={e => setStartingCash(e.target.value)} 
                              placeholder="0.00"
                              className="text-lg"
                          />
                      </div>
                  ) : (
                      <div className="space-y-2 text-sm">
                          <div className="flex justify-between border-b pb-2">
                              <span className="text-muted-foreground">Started At</span>
                              <span>{shiftData?.startTime ? format(new Date(shiftData.startTime), 'MMM d, h:mm a') : '-'}</span>
                          </div>
                          <div className="flex justify-between border-b pb-2">
                              <span className="text-muted-foreground">Starting Cash</span>
                              <span>₱{shiftData?.startingCash?.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between border-b pb-2">
                              <span className="text-muted-foreground">Cashier</span>
                              <span>{shiftData?.cashier}</span>
                          </div>
                      </div>
                  )}
              </div>
              <DialogFooter>
                  {!isShiftOpen ? (
                      <Button className="w-full" onClick={handleOpenShift} disabled={!startingCash}>Open Register</Button>
                  ) : (
                      <Button variant="destructive" className="w-full" onClick={handleCloseShift}>Close Shift & Z-Read</Button>
                  )}
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
          <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                  <DialogTitle className="text-center">Receipt</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[400px] pr-4 font-mono text-xs border rounded p-4 bg-white text-black shadow-inner">
                  {lastTransaction && (
                      <div className="space-y-2 text-center">
                          <div className="font-bold text-lg">TUNFLOW MARKET</div>
                          <div>123 Ocean Drive, Manila</div>
                          <div>VAT REG: 123-456-789</div>
                          <Separator className="my-2 border-black" />
                          <div className="flex justify-between">
                              <span>OR #: {lastTransaction.id}</span>
                              <span>{(() => { try { return format(new Date(lastTransaction.date), 'MM/dd/yy h:mm a'); } catch { return '-'; } })()}</span>
                          </div>
                          <div className="flex justify-between">
                              <span>Cashier: Admin</span>
                              <span>Cust: {lastTransaction.customer?.full_name || 'Walk-in'}</span>
                          </div>
                          <Separator className="my-2 border-dashed border-black" />
                          <div className="space-y-1">
                              {lastTransaction.items.map((item: CartItem, i: number) => (
                                  <div key={i} className="flex justify-between">
                                      <span>{item.qty} x {item.name || 'Item'} {item.isPack ? '(Pack)' : ''}</span>
                                      <span>{((item.selling_price * item.qty) - (item.selling_price * item.qty * ((item.discount || 0)/100))).toFixed(2)}</span>
                                  </div>
                              ))}
                          </div>
                          <Separator className="my-2 border-dashed border-black" />
                          <div className="flex justify-between font-bold">
                              <span>SUBTOTAL</span>
                              <span>{lastTransaction.subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                              <span>DISCOUNT</span>
                              <span>-{lastTransaction.discount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-lg">
                              <span>TOTAL</span>
                              <span>{lastTransaction.total.toFixed(2)}</span>
                          </div>
                          <Separator className="my-2 border-dashed border-black" />
                          <div className="flex justify-between">
                              <span>CASH</span>
                              <span>{lastTransaction.amountTendered.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                              <span>CHANGE</span>
                              <span>{lastTransaction.change.toFixed(2)}</span>
                          </div>
                          <div className="mt-6 text-center">
                              *** THANK YOU ***
                              <br />
                              Item Sold is Non-Refundable
                          </div>
                      </div>
                  )}
              </ScrollArea>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => setIsReceiptOpen(false)}>Close</Button>
                  <Button onClick={() => window.print()} className="flex-1 gap-2">
                      <Receipt className="h-4 w-4" /> Print Receipt
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Discount Dialog */}
      <Dialog open={isDiscountOpen} onOpenChange={setIsDiscountOpen}>
          <DialogContent className="sm:max-w-xs">
              <DialogHeader><DialogTitle>Apply Discount</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                  <div className="flex gap-2">
                      <Button 
                          variant={discountType === 'percent' ? 'default' : 'outline'} 
                          onClick={() => setDiscountType('percent')}
                          className="flex-1"
                      >
                          Percent (%)
                      </Button>
                      <Button 
                          variant={discountType === 'fixed' ? 'default' : 'outline'} 
                          onClick={() => setDiscountType('fixed')}
                          className="flex-1"
                      >
                          Fixed (₱)
                      </Button>
                  </div>
                  <Input 
                      type="number" 
                      placeholder={discountType === 'percent' ? "Enter percentage (e.g. 10)" : "Enter amount (e.g. 50)"}
                      value={discountValue}
                      onChange={e => setDiscountValue(e.target.value)}
                  />
                  <div className="grid grid-cols-3 gap-2">
                      {[5, 10, 20].map(p => (
                          <Button key={p} variant="outline" size="sm" onClick={() => { setDiscountType('percent'); setDiscountValue(p.toString()); }}>
                              {p}%
                          </Button>
                      ))}
                  </div>
              </div>
              <DialogFooter>
                  <Button className="w-full" onClick={applyDiscount}>Apply Discount</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* AI Assistant Dialog */}
      <Dialog open={isAIChatOpen} onOpenChange={setIsAIChatOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-600" /> AI Assistant</DialogTitle></DialogHeader>
            <div className="flex flex-col gap-4">
                <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-muted/50">
                    {!aiResponse ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center opacity-70">
                            <Sparkles className="h-10 w-10 mb-2" />
                            <p>Ask me anything about products, prices, or bundling!</p>
                            <p className="text-xs mt-2">Example: "What is the best selling item?"</p>
                        </div>
                    ) : (
                        <div className="text-sm leading-relaxed whitespace-pre-wrap">{aiResponse}</div>
                    )}
                </ScrollArea>
                <div className="flex gap-2">
                    <Input 
                        placeholder="Ask AI..." 
                        value={aiMessage} 
                        onChange={e => setAiMessage(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAskAI()}
                        disabled={aiLoading}
                    />
                    <Button onClick={handleAskAI} disabled={aiLoading || !aiMessage.trim()} className="bg-purple-600 hover:bg-purple-700">
                        {aiLoading ? <Sparkles className="animate-spin h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// Subcomponent: Cart List
function CartList({ cart, updateQty, removeFromCart }: any) {
    return (
        <div className="flex-1 overflow-auto p-2 space-y-2 bg-muted/10">
            {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-2">
                    <ShoppingCart className="h-12 w-12" />
                    <p>Cart is empty</p>
                </div>
            ) : (
                cart.map((item: CartItem) => (
                    <div key={`${item.id}-${item.isPack}`} className="flex gap-2 items-center bg-card p-2 rounded-lg border shadow-sm relative group">
                        <div className="h-10 w-10 bg-muted rounded flex items-center justify-center font-bold text-xs text-muted-foreground shrink-0">
                            {item.isPack ? <Package className="h-4 w-4 text-purple-600" /> : (item.name || "?").substring(0,2)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate flex items-center gap-2">
                                {item.name || "Unknown"} 
                                {item.isPack && <Badge variant="secondary" className="text-[10px] h-4 px-1">{item.packName || 'Pack'}</Badge>}
                            </h4>
                            <div className="text-xs text-muted-foreground">
                                ₱{item.selling_price || 0} x {item.qty} {item.unit_of_measure || 'unit'}
                            </div>
                        </div>
                        <div className="font-bold text-sm">
                            ₱{(item.selling_price * item.qty).toFixed(2)}
                        </div>
                        <div className="flex flex-col gap-1 ml-2">
                            <Button variant="ghost" size="icon" className="h-6 w-6 border" onClick={() => updateQty(item.id, 1, !!item.isPack)}>
                                <Plus className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 border" onClick={() => updateQty(item.id, -1, !!item.isPack)}>
                                <Minus className="h-3 w-3" />
                            </Button>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive absolute -top-2 -right-2 bg-card border shadow-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeFromCart(item.id, !!item.isPack)}>
                            <XCircle className="h-4 w-4" />
                        </Button>
                    </div>
                ))
            )}
        </div>
    );
}

// Subcomponent: Footer Summary
function CartSummaryFooter({ subtotal, tax, total, cartCount, onCheckout, onHold, onDiscount }: any) {
    return (
        <div className="p-4 bg-card border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10">
            <div className="space-y-1 mb-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>₱{subtotal.toFixed(2)}</span>
                </div>
                {/* <div className="flex justify-between text-muted-foreground">
                    <span>Tax (12%)</span>
                    <span>₱{tax.toFixed(2)}</span>
                </div> */}
                <div className="flex justify-between text-xl font-extrabold mt-2 text-primary">
                    <span>Total</span>
                    <span>₱{total.toFixed(2)}</span>
                </div>
            </div>
            
            <div className="grid grid-cols-4 gap-2 h-12">
                 <Button variant="outline" className="col-span-1 h-full flex-col gap-0 text-xs" onClick={onHold} disabled={cartCount === 0}>
                    <PauseCircle className="h-4 w-4" /> Hold
                 </Button>
                 <Button variant="outline" className="col-span-1 h-full flex-col gap-0 text-xs" onClick={onDiscount} disabled={cartCount === 0}>
                    <Tag className="h-4 w-4" /> Disc.
                 </Button>
                 <Button className="col-span-2 h-full bg-green-600 hover:bg-green-700 text-lg font-bold shadow-md" onClick={onCheckout} disabled={cartCount === 0}>
                    PAY ₱{total.toFixed(2)}
                 </Button>
            </div>
        </div>
    );
}
