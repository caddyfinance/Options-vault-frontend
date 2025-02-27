import { Card } from "@/components/ui/card";
import { Timer, LineChart, DollarSign, LockIcon, TrendingUp } from "lucide-react";
import { useAccount, useContract } from "@starknet-react/core";
import { useStarkPrice } from "@/hooks/useStarkPrice";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VAULT_CONTRACT_ABI } from "@/abi/VaultContract.abi";
import { useTotalValueLocked } from "@/hooks/useTotalValueLocked";

const VAULT_CONTRACT_ADDRESS = import.meta.env.VITE_VAULT_CONTRACT_ADDRESS;

interface PremiumStats {
  totalPremium: number;
  dailyGrowth: number;
}

interface VaultStatsProps {
  updateTrigger: number;
}

export function VaultStats({ updateTrigger }: VaultStatsProps) {
  const { address } = useAccount();
  const [tvlStrk, setTvlStrk] = useState<string>("0");
  const [activeOptionsCount, setActiveOptionsCount] = useState<number>(0);
  const [premiumStats, setPremiumStats] = useState<PremiumStats>({ totalPremium: 0, dailyGrowth: 0 });
  const [isDataLoading, setIsDataLoading] = useState(true);
  const { price: strkPrice, isLoading: isPriceLoading } = useStarkPrice();
  const { tvl, isLoading, error, refetch: fetchTVL } = useTotalValueLocked();


  useEffect(() => {
    const fetchData = async () => {
      if (!address) return;

      try {
        setIsDataLoading(true);

        // Get user ID first
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('wallet_address', address)
          .single();

        if (!userData?.id) return;

        // Calculate total premium earned
        const { data: totalPremiumData, error: premiumError } = await supabase
          .from('options')
          .select('premium, created_at')
          .eq('user_id', userData.id)
          .in('status', ['active', 'executed']);

        if (premiumError) throw premiumError;

        // Calculate total premium
        const totalPremium = totalPremiumData?.reduce((sum, option) => 
          sum + Number(option.premium), 0
        ) || 0;

        // Calculate daily growth (last 24 hours)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const { data: dailyPremiumData, error: dailyError } = await supabase
          .from('options')
          .select('premium')
          .in('status', ['active', 'executed'])
          .gte('created_at', yesterday.toISOString());

        if (dailyError) throw dailyError;

        const dailyPremium = dailyPremiumData?.reduce((sum, option) => 
          sum + Number(option.premium), 0
        ) || 0;

        setPremiumStats({
          totalPremium,
          dailyGrowth: dailyPremium
        });

        // Get all deposits
        const { data: deposits } = await supabase
          .from('deposits')
          .select('amount')
          .eq('status', 'deposit');

        const { data: withdrawals } = await supabase
          .from('withdrawals')
          .select('amount')
          .eq('status', 'deposit');

        const totalDeposits = deposits?.reduce((sum, tx) => 
          sum + Number(tx.amount), 0
        ) || 0;

        const totalWithdrawals = withdrawals?.reduce((sum, tx) => 
          sum + Number(tx.amount), 0
        ) || 0;

        const calculatedTvl = totalDeposits - totalWithdrawals;
        setTvlStrk(calculatedTvl.toFixed(2));

        // Get active options count
        const { count: activeCount } = await supabase
          .from('options')
          .select('*', { count: 'exact' })
          .eq('status', 'active');

        setActiveOptionsCount(activeCount || 0);

      } catch (error) {
        console.error('Error fetching data:', error);
        setTvlStrk("0");
        setPremiumStats({ totalPremium: 0, dailyGrowth: 0 });
        setActiveOptionsCount(0);
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchData();
  }, [address, updateTrigger]);


  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="stats-card p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Value Locked</p>
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold">
                {isDataLoading || isLoading? "Loading..." : `${tvl} STRK`}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isDataLoading || isPriceLoading 
                  ? "Calculating..." 
                  : `$ ${tvl * strkPrice} USD`
                }
              </p>
            </div>
          </div>
          <LockIcon className="h-8 w-8 text-primary animate-float" />
        </div>
      </Card>

      <Card className="stats-card p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Active Options</p>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">
                {isDataLoading ? "Loading..." : activeOptionsCount}
              </h2>
            </div>
          </div>
          <Timer className="h-8 w-8 text-secondary animate-float" />
        </div>
      </Card>

      <Card className="stats-card p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Premium Earned</p>
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold">
                {isDataLoading ? "Loading..." : `${premiumStats.totalPremium.toFixed(2)} STRK`}
              </h2>
              <div className="flex items-center gap-1 text-sm text-green-500">
                <TrendingUp className="h-4 w-4" />
                <span>+{premiumStats.dailyGrowth.toFixed(2)} STRK (24h)</span>
              </div>
            </div>
          </div>
          <DollarSign className="h-8 w-8 text-primary animate-float" />
        </div>
      </Card>

      <Card className="stats-card p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">APY</p>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">
              {isDataLoading 
                  ? "Loading..." 
                  : Number(tvlStrk) > 0 
                    ? `${((premiumStats.dailyGrowth * 365 * 100) / Number(tvlStrk)).toFixed(2)}%`
                    : "0.00%"
                }
              </h2>
            </div>
          </div>
          <LineChart className="h-8 w-8 text-primary animate-float" />
        </div>
      </Card>
    </div>
  );
}