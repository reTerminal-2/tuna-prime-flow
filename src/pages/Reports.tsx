import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

const Reports = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground">
          View performance insights and analytics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Waste Report</CardTitle>
            <CardDescription>Total value and quantity of spoiled products</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Coming soon...</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales Report</CardTitle>
            <CardDescription>Filter sales by date, product, or category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Coming soon...</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profit Report</CardTitle>
            <CardDescription>Revenue minus cost of goods sold</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Coming soon...</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Valuation</CardTitle>
            <CardDescription>Total value of remaining inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Coming soon...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
