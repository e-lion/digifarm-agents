"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Calendar, MapPin, CheckCircle, Clock, AlertCircle, Eye, EyeOff } from "lucide-react";
import { toggleAgentVisibility } from "@/lib/actions/users";
import { toast } from "sonner";
import { useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import dynamic from 'next/dynamic';

const DynamicMap = dynamic(() => import('@/components/map/Map'), { 
  loading: () => <div className="h-48 w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-xs text-gray-400">Loading map...</div>,
  ssr: false 
});

interface Visit {
  id: string;
  buyer_name: string;
  status: string;
  scheduled_date: string;
  completed_at: string | null;
  checked_in_at: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  check_in_location: any;
  isLocationVerified?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parsedCheckIn?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buyerLocation?: any;
}

interface AgentMetrics {
  id: string;
  full_name: string | null;
  email: string;
  totalVisits: number;
  completedVisits: number;
  verifiedVisits: number;
  completionRate: number;
  visits: Visit[];
  hidden: boolean;
}

interface AgentsViewProps {
  agentsWithMetrics: AgentMetrics[];
  startDate: string;
  endDate: string;
}

export function AgentsView({
  agentsWithMetrics = [],
  startDate,
  endDate,
}: AgentsViewProps) {
  console.log("AgentsView Props:", {
    agentsWithMetrics: !!agentsWithMetrics,
    agentsWithMetricsLength: agentsWithMetrics?.length || 0,
    startDate,
    endDate,
  });

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDateChange = (type: "start" | "end", value: string) => {
    const params = new URLSearchParams(searchParams);
    if (type === "start") params.set("startDate", value);
    if (type === "end") params.set("endDate", value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleExport = () => {
    if (!agentsWithMetrics) return;
    const headers = [
      "Agent Name",
      "Email",
      "Total Visits",
      "Completed Visits",
      "Verified Visits",
      "Completion Rate",
    ];
    const rows = agentsWithMetrics.map((agent) => [
      agent?.full_name || "Unknown",
      agent?.email || "",
      agent?.totalVisits || 0,
      agent?.completedVisits || 0,
      agent?.verifiedVisits || 0,
      `${agent?.completionRate || 0}%`,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `agent_performance_${startDate}_to_${endDate}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const onToggleVisibility = (agentId: string, currentHidden: boolean) => {
    startTransition(async () => {
      try {
        await toggleAgentVisibility(agentId, currentHidden);
        toast.success(currentHidden ? "Agent unhidden" : "Agent hidden");
      } catch (e) {
        console.error(e);
        toast.error("Failed to update visibility");
      }
    });
  };

  const filteredAgents = agentsWithMetrics.filter(agent => (agent.hidden ?? false) === showHidden);

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-end items-start xl:items-center gap-4">
        {/* Date Picker & Export */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-xs text-gray-500">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleDateChange("start", e.target.value)}
              className="text-base border-none focus:ring-0 p-0 text-gray-700 w-32"
            />
          </div>
          <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-xs text-gray-500">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleDateChange("end", e.target.value)}
              className="text-base border-none focus:ring-0 p-0 text-gray-700 w-32"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="ml-auto sm:ml-0"
          >
            Export CSV
          </Button>

          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
            <Button
              variant={!showHidden ? "primary" : "ghost"}
              size="sm"
              onClick={() => setShowHidden(false)}
              className="h-8 text-xs"
            >
              Active
            </Button>
            <Button
              variant={showHidden ? "primary" : "ghost"}
              size="sm"
              onClick={() => setShowHidden(true)}
              className="h-8 text-xs"
            >
              Hidden
            </Button>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Daily Performance</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="space-y-4">
            {(filteredAgents?.length || 0) > 0 ? (
              <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                {filteredAgents?.map((agent, index) => (
                  <div
                    key={agent?.id || `agent-${index}`}
                    className="group flex flex-col p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-gray-900">
                          {agent.full_name || "Unknown Agent"}
                        </h3>
                        <p className="text-xs text-gray-500">{agent.email}</p>
                      </div>
                      <div
                        className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          agent.completionRate >= 80
                            ? "bg-green-100 text-green-700"
                            : agent.completionRate >= 50
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {agent.completionRate}% Done
                      </div>
                      <button
                        onClick={() => onToggleVisibility(agent.id, agent.hidden)}
                        disabled={isPending}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title={agent.hidden ? "Unhide Agent" : "Hide Agent"}
                      >
                        {agent.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                      <div className="bg-gray-50 p-2 rounded-lg">
                        <span className="block text-xs text-gray-500 uppercase">
                          Planned
                        </span>
                        <span className="text-lg font-bold text-gray-900">
                          {agent.totalVisits}
                        </span>
                      </div>
                      <div className="bg-blue-50 p-2 rounded-lg">
                        <span className="block text-xs text-blue-500 uppercase">
                          Done
                        </span>
                        <span className="text-lg font-bold text-blue-700">
                          {agent.completedVisits}
                        </span>
                      </div>
                      <div className="bg-green-50 p-2 rounded-lg">
                        <span className="block text-xs text-green-500 uppercase">
                          Verified
                        </span>
                        <span className="text-lg font-bold text-green-700">
                          {agent.verifiedVisits}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            agent.completionRate >= 80
                              ? "bg-green-500"
                              : agent.completionRate >= 50
                                ? "bg-yellow-500"
                                : "bg-blue-500"
                          }`}
                          style={{ width: `${agent.completionRate}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-auto pt-2 border-t border-gray-50">
                      <Dialog>
                        <DialogTrigger asChild>
                          <button className="w-full text-xs font-medium text-gray-500 hover:text-gray-900 flex items-center justify-center gap-1 py-1">
                            View Visits
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>
                              Visit Log: {agent.full_name || "Unknown Agent"}
                            </DialogTitle>
                            <DialogDescription>
                              Details of visits from {startDate} to {endDate}.
                            </DialogDescription>
                          </DialogHeader>

                          <div className="mt-4 space-y-3">
                            {agent?.visits &&
                            (agent.visits?.length || 0) > 0 ? (
                              agent.visits.map((visit) => (
                                <div
                                  key={visit.id}
                                  className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                                >
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-gray-900">
                                      {visit.buyer_name}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {visit.status === "completed" ? (
                                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                                          <CheckCircle className="h-3 w-3" />{" "}
                                          Done
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">
                                          <Clock className="h-3 w-3" /> Pending
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="text-xs text-gray-500 space-y-1">
                                    <div className="flex justify-between">
                                      <span>Planned:</span>
                                      <span className="font-mono">
                                        {visit.scheduled_date
                                          ? new Date(
                                              visit.scheduled_date,
                                            ).toLocaleString("en-US", {
                                              month: "short",
                                              day: "numeric",
                                              year: "numeric",
                                              hour: "numeric",
                                              minute: "2-digit",
                                              hour12: true,
                                            })
                                          : "-"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Check-in:</span>
                                      <span className="font-mono">
                                        {visit.checked_in_at
                                          ? new Date(
                                              visit.checked_in_at,
                                            ).toLocaleString("en-US", {
                                              month: "short",
                                              day: "numeric",
                                              year: "numeric",
                                              hour: "numeric",
                                              minute: "2-digit",
                                              hour12: true,
                                            })
                                          : "-"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Completed At:</span>
                                      <span className="font-mono">
                                        {visit.completed_at
                                          ? new Date(
                                              visit.completed_at,
                                            ).toLocaleString("en-US", {
                                              month: "short",
                                              day: "numeric",
                                              year: "numeric",
                                              hour: "numeric",
                                              minute: "2-digit",
                                              hour12: true,
                                            })
                                          : "-"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center pt-1 border-t border-gray-100 mt-2">
                                      <span>Location Verified:</span>
                                      {visit.isLocationVerified ? (
                                        <span className="flex items-center gap-1 text-green-600 font-medium">
                                          <MapPin className="h-3 w-3" /> Yes
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1 text-red-500 font-medium">
                                          <AlertCircle className="h-3 w-3" /> No
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {visit.parsedCheckIn && (
                                      <div className="mt-3 border-t border-gray-100 pt-3">
                                          <Button 
                                              variant="outline" 
                                              size="sm"
                                              className="w-full text-xs h-8"
                                              onClick={() => setActiveMapId(activeMapId === visit.id ? null : visit.id)}
                                          >
                                              {activeMapId === visit.id ? 'Hide Map' : 'View Location Map'}
                                          </Button>
                                          
                                          {activeMapId === visit.id && (
                                              <div className="mt-2 h-48 w-full rounded-lg overflow-hidden border border-gray-200 shadow-inner">
                                                  <DynamicMap 
                                                      center={[visit.parsedCheckIn.lat, visit.parsedCheckIn.lng]}
                                                      zoom={17}
                                                      hideLocate={true}
                                                      bounds={
                                                          visit.buyerLocation?.location_lat && 
                                                          (visit.buyerLocation.location_lat !== visit.parsedCheckIn.lat || 
                                                           visit.buyerLocation.location_lng !== visit.parsedCheckIn.lng)
                                                          ? [
                                                              [visit.parsedCheckIn.lat, visit.parsedCheckIn.lng],
                                                              [visit.buyerLocation.location_lat, visit.buyerLocation.location_lng]
                                                          ] : undefined
                                                      }
                                                      markers={[{
                                                          id: 'check-in',
                                                          position: [visit.parsedCheckIn.lat, visit.parsedCheckIn.lng],
                                                          popup: 'Check-in Location'
                                                      }]}
                                                      circles={visit.buyerLocation?.location_lat ? [{
                                                          id: 'geofence',
                                                          center: [visit.buyerLocation.location_lat, visit.buyerLocation.location_lng],
                                                          radius: 100,
                                                          color: visit.isLocationVerified ? '#16a34a' : '#2563eb',
                                                          name: 'Expected Buyer Area'
                                                      }] : []}
                                                  />
                                              </div>
                                          )}
                                      </div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <p>No visits scheduled for this date.</p>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p>{showHidden ? "No hidden agents found." : "No active agents found."}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
