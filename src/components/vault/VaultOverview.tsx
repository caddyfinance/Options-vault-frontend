import { VaultHistory } from "./VaultHistory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccount } from "@starknet-react/core";
import { ActiveOptions } from "../ActiveOptions";
import { useState } from "react";

interface VaultOverviewProps {
  updateTrigger: number;
}

export function VaultOverview({ updateTrigger }: VaultOverviewProps) {
  const { address } = useAccount();
  const [localUpdateTrigger, setLocalUpdateTrigger] = useState(0);

  if (!address) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vault Overview</CardTitle>
        <CardDescription>
          View your active options and transaction history
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="options" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="options">Active Options</TabsTrigger>
            <TabsTrigger value="history">Transaction History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="options">
            <div className="space-y-4">
              <div className="text-center py-4 text-muted-foreground">
                <ActiveOptions 
                  updateTrigger={updateTrigger + localUpdateTrigger} 
                  onTransactionComplete={() => setLocalUpdateTrigger(prev => prev + 1)} 
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <div className="space-y-4">
              <VaultHistory updateTrigger={updateTrigger + localUpdateTrigger} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 