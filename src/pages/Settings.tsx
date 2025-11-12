import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

const Settings = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure application settings and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>System configuration and preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <SettingsIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Settings configuration coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
