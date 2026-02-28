
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Star, Eye, ChevronLeft, ChevronRight, X, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Product {
    id: string;
    name: string;
    selling_price: number;
    description: string | null;
    category: string;
    images: string[] | null;
    image_url: string | null;
    unit_of_measure: string;
}

interface QuickViewDialogProps {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
    onAddToCart: (product: any) => void;
}

export function QuickViewDialog({ product, isOpen, onClose, onAddToCart }: QuickViewDialogProps) {
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    if (!product) return null;

    const images = product.images && product.images.length > 0 ? product.images : (product.image_url ? [product.image_url] : []);

    const handleNext = () => {
        setActiveImageIndex((prev) => (prev + 1) % images.length);
    };

    const handlePrev = () => {
        setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[850px] p-0 overflow-hidden border-none shadow-premium bg-white/95 backdrop-blur-xl">
                <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
                    {/* Left: Gallery */}
                    <div className="w-full md:w-1/2 bg-muted/30 relative group aspect-square md:aspect-auto">
                        {images.length > 0 ? (
                            <img
                                src={images[activeImageIndex]}
                                alt={product.name}
                                className="w-full h-full object-cover transition-all duration-500"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground/20">
                                <Package className="h-20 w-20" />
                            </div>
                        )}

                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={handlePrev}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40"
                                >
                                    <ChevronLeft className="h-6 w-6" />
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40"
                                >
                                    <ChevronRight className="h-6 w-6" />
                                </button>
                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
                                    {images.map((_, i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "h-1.5 rounded-full transition-all duration-300",
                                                i === activeImageIndex ? "w-8 bg-primary" : "w-1.5 bg-white/50"
                                            )}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Right: Info */}
                    <div className="flex-1 p-8 md:p-10 flex flex-col justify-between overflow-y-auto">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[10px] uppercase font-bold tracking-widest px-3 py-1">
                                    {product.category}
                                </Badge>
                                <button
                                    onClick={onClose}
                                    className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <h2 className="text-3xl font-black text-gray-900 leading-tight mb-2">{product.name}</h2>
                            <div className="flex items-center gap-1 mb-6 text-orange-400">
                                {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                                <span className="text-xs text-muted-foreground ml-2">(48 reviews)</span>
                            </div>

                            <div className="text-3xl font-black text-primary mb-6">
                                ₱{Number(product.selling_price).toFixed(2)}
                                <span className="text-sm font-normal text-muted-foreground ml-2">per {product.unit_of_measure}</span>
                            </div>

                            <div className="space-y-4 mb-8">
                                <p className="text-muted-foreground leading-relaxed text-sm italic">
                                    "{product.description || "No description available for this premium selection."}"
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 py-6 border-y mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center">
                                        <Package className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Availability</p>
                                        <p className="text-sm font-bold">In Stock</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                        <Star className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Certified</p>
                                        <p className="text-sm font-bold">Premium Quality</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Button
                                className="flex-1 h-14 rounded-2xl text-lg font-bold shadow-premium transition-all hover:scale-[1.02] active:scale-[0.98]"
                                onClick={() => {
                                    onAddToCart(product);
                                    onClose();
                                }}
                            >
                                <ShoppingCart className="mr-2 h-5 w-5" />
                                Add to Cart
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
