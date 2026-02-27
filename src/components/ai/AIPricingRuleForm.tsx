import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, TrendingUp, AlertCircle } from "lucide-react";
import { aiService } from "@/services/aiService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIPricingRuleFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: {
        name?: string;
        rule_type?: 'markdown' | 'markup';
        price_adjustment_percent?: number;
        description?: string;
        applies_to_category?: string;
    };
    onSuccess?: () => void;
}

export const AIPricingRuleForm: React.FC<AIPricingRuleFormProps> = ({ open, onOpenChange, initialData, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: "",
        rule_type: "markdown" as "markdown" | "markup",
        price_adjustment_percent: "5",
        description: "",
        applies_to_category: "fresh",
        condition_days: "30",
        priority: "1"
    });

    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [simulationResult, setSimulationResult] = useState<string | null>(null);

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                ...prev,
                name: initialData.name || prev.name,
                rule_type: initialData.rule_type || prev.rule_type,
                price_adjustment_percent: initialData.price_adjustment_percent?.toString() || prev.price_adjustment_percent,
                description: initialData.description || prev.description,
                applies_to_category: initialData.applies_to_category || prev.applies_to_category
            }));
        }
    }, [initialData, open]);

    const handleGenerateDescription = async () => {
        if (!formData.name) {
            toast.error("Please enter a rule name first.");
            return;
        }
        setIsGeneratingDesc(true);
        try {
            const desc = await aiService.generatePricingRuleDescription(formData.name, formData.rule_type);
            setFormData(prev => ({ ...prev, description: desc }));
            toast.success("Description generated!");
        } catch (error) {
            toast.error("Failed to generate description");
        } finally {
            setIsGeneratingDesc(false);
        }
    };

    const handleSimulateLogic = async () => {
        if (!formData.name || !formData.price_adjustment_percent) {
            toast.error("Please enter a name and adjustment percentage.");
            return;
        }
        setIsSimulating(true);
        try {
            const result = await aiService.simulatePricingRuleLogic(
                formData.name,
                formData.rule_type,
                parseFloat(formData.price_adjustment_percent)
            );
            setSimulationResult(result);
            toast.success("Logic simulated!");
        } catch (error) {
            toast.error("Failed to simulate rule logic");
        } finally {
            setIsSimulating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No active session");

            const ruleData = {
                name: formData.name,
                rule_type: formData.rule_type,
                price_adjustment_percent: parseFloat(formData.price_adjustment_percent),
                description: formData.description,
                applies_to_category: formData.applies_to_category as any,
                condition_days: parseInt(formData.condition_days),
                priority: parseInt(formData.priority),
                user_id: session.user.id,
                is_active: true
            };

            const { error } = await supabase
                .from('pricing_rules')
                .insert(ruleData);

            if (error) throw error;

            toast.success("Pricing rule created successfully!");
            onOpenChange(false);
            if (onSuccess) onSuccess();

            // Reset form
            setFormData({
                name: "",
                rule_type: "markdown",
                price_adjustment_percent: "5",
                description: "",
                applies_to_category: "fresh",
                condition_days: "30",
                priority: "1"
            });
            setSimulationResult(null);

        } catch (error: any) {
            toast.error(`Error creating rule: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        AI-Enhanced Pricing Strategy
                    </DialogTitle>
                    <DialogDescription>
                        Configure automated pricing rules and use AI to predict their impact on your business.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Rule Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Clearance Markdown"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rule_type">Rule Type</Label>
                            <Select
                                value={formData.rule_type}
                                onValueChange={(val: any) => setFormData({ ...formData, rule_type: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="markup">Markup (Price Up)</SelectItem>
                                    <SelectItem value="markdown">Markdown (Price Down)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="adjustment">Adjustment (%)</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="adjustment"
                                    type="number"
                                    value={formData.price_adjustment_percent}
                                    onChange={e => setFormData({ ...formData, price_adjustment_percent: e.target.value })}
                                    placeholder="5"
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="shrink-0 text-purple-600 border-purple-200 hover:bg-purple-50"
                                    onClick={handleSimulateLogic}
                                    disabled={isSimulating}
                                    title="Simulate with AI"
                                >
                                    {isSimulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Applies To Category</Label>
                            <Select
                                value={formData.applies_to_category}
                                onValueChange={val => setFormData({ ...formData, applies_to_category: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fresh">Fresh Fish</SelectItem>
                                    <SelectItem value="frozen">Frozen</SelectItem>
                                    <SelectItem value="canned">Canned Goods</SelectItem>
                                    <SelectItem value="dried">Dried</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {simulationResult && (
                        <div className="text-xs text-purple-600 bg-purple-50 p-3 rounded-lg border border-purple-100 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-semibold mb-1 uppercase tracking-wider text-[10px]">AI Projection</p>
                                <p className="leading-relaxed">{simulationResult}</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="condition_days">Condition (Days stagnant)</Label>
                            <Input
                                id="condition_days"
                                type="number"
                                value={formData.condition_days}
                                onChange={e => setFormData({ ...formData, condition_days: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="priority">Priority Index</Label>
                            <Input
                                id="priority"
                                type="number"
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="description">Rule Description</Label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={handleGenerateDescription}
                                disabled={isGeneratingDesc}
                            >
                                {isGeneratingDesc ? (
                                    <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Thinking...</>
                                ) : (
                                    <><Sparkles className="h-3 w-3 mr-1" /> AI Suggestion</>
                                )}
                            </Button>
                        </div>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe how this rule applies..."
                            className="h-20"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Activate Rule
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
