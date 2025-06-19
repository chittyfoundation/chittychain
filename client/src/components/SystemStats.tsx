import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useBlockchain } from "@/hooks/useBlockchain";

export function SystemStats() {
  const { stats } = useBlockchain();
  
  const { data: systemStats } = useQuery({
    queryKey: ['/api/stats'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const statCards = [
    {
      title: "Total Blocks",
      value: stats?.totalBlocks?.toLocaleString() || "0",
      change: "+12.5%",
      trend: "up",
      icon: "🧱",
      color: "text-chitty-blue",
    },
    {
      title: "Evidence Records",
      value: systemStats?.blockchain?.evidenceRecords?.toLocaleString() || "0",
      change: "+8.2%",
      trend: "up",
      icon: "🛡️",
      color: "text-green-400",
    },
    {
      title: "Active Cases",
      value: systemStats?.cases?.activeCases?.toLocaleString() || "0",
      change: "+3",
      trend: "up",
      icon: "⚖️",
      color: "text-yellow-400",
    },
    {
      title: "Property NFTs",
      value: systemStats?.properties?.totalProperties?.toLocaleString() || "0",
      change: "+15",
      trend: "up",
      icon: "🏠",
      color: "text-purple-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <Card 
          key={index} 
          className="bg-chitty-card border-chitty-border hover:border-chitty-blue transition-colors"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{stat.title}</p>
                <p className={`text-2xl font-bold text-white`}>
                  {stat.value}
                </p>
              </div>
              <div className={`text-3xl p-3 rounded-lg bg-opacity-20 ${stat.color.replace('text-', 'bg-')}`}>
                {stat.icon}
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              {stat.trend === "up" ? (
                <TrendingUp className="text-green-400 mr-1" size={16} />
              ) : (
                <TrendingDown className="text-red-400 mr-1" size={16} />
              )}
              <span className={stat.trend === "up" ? "text-green-400" : "text-red-400"}>
                {stat.change}
              </span>
              <span className="text-gray-400 ml-2">
                {index === 0 && "from yesterday"}
                {index === 1 && "this week"}
                {index === 2 && "new today"}
                {index === 3 && "minted today"}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
