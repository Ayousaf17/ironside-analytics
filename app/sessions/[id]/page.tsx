import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatUser } from "@/lib/utils";
import { ArrowLeft, Database, Terminal, Clock, Activity, AlertCircle } from "lucide-react";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // 1. Fetch Session Details
  const { data: session } = await supabase.rpc('get_session_details', { 
    target_session_id: id 
  });

  // 2. Fetch Associated Logs (Using the Smart Match logic)
  const { data: logsJson } = await supabase.rpc('get_session_logs', { 
    target_session_id: id 
  });
  
  const logs = Array.isArray(logsJson) ? logsJson : [];
  const totalCost = logs.reduce((acc: number, log: any) => acc + (log.cost || 0), 0);

  // Calculate simple stats for this session
  const errorCount = logs.filter((l: any) => l.status_code >= 400).length;
  const duration = logs.length > 1 
    ? new Date(logs[logs.length - 1].created_at).getTime() - new Date(logs[0].created_at).getTime()
    : 0;

  if (!session) {
    return (
      <div className="p-8 space-y-4">
        <h1 className="text-2xl font-bold text-red-500">Session Not Found</h1>
        <p className="text-muted-foreground">Could not locate session ID: <span className="font-mono">{id}</span></p>
        <Link href="/" className="text-blue-500 hover:underline">← Return Home</Link>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header / Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Link href="/" className="p-2 rounded-full hover:bg-accent border transition-colors">
               <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Session Analysis</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(session.created_at).toLocaleString()}
                    <span className="text-border">|</span>
                    <span className="font-mono text-xs">{id}</span>
                </div>
            </div>
        </div>
        <div className="flex gap-2">
            <Badge variant={session.channel === 'slack' ? 'default' : 'secondary'} className="capitalize">
                {session.channel}
            </Badge>
            {errorCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" /> {errorCount} Errors
                </Badge>
            )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">User</CardTitle></CardHeader>
            <CardContent>
                <div className="text-xl font-bold">{formatUser(session.user_id)}</div>
                <div className="text-xs text-muted-foreground font-mono truncate">{session.user_id}</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Cost</CardTitle></CardHeader>
            <CardContent>
                <div className="text-xl font-bold text-green-600">{formatCurrency(totalCost)}</div>
                <div className="text-xs text-muted-foreground">{logs.length} API Calls</div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Est. Duration</CardTitle></CardHeader>
            <CardContent>
                <div className="text-xl font-bold">{(duration / 1000).toFixed(2)}s</div>
                <div className="text-xs text-muted-foreground">End-to-end execution</div>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Transcript Length</CardTitle></CardHeader>
            <CardContent>
                <div className="text-xl font-bold">
                    {session.raw_text ? session.raw_text.length : 0} chars
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Transcript Area */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 border-b bg-muted/40 py-3">
            <Terminal className="h-4 w-4" />
            <CardTitle className="text-base">User Prompt</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
            <div className="bg-muted/50 p-4 rounded-md text-sm font-mono whitespace-pre-wrap border">
                {session.raw_text || <span className="text-muted-foreground italic">No text content recorded.</span>}
            </div>
        </CardContent>
      </Card>

      {/* API Logs Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Execution Trace</h2>
            </div>
            <div className="text-xs text-muted-foreground">
                Showing logs linked by <span className="font-bold">Thread ID</span> or <span className="font-bold">User Activity Window</span>
            </div>
        </div>
        
        <div className="rounded-md border bg-card overflow-hidden shadow-sm">
            <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm text-left">
                    <thead className="[&_tr]:border-b bg-muted/50">
                        <tr className="border-b transition-colors hover:bg-muted/50">
                            <th className="h-10 px-4 align-middle font-medium text-muted-foreground w-[100px]">Time</th>
                            <th className="h-10 px-4 align-middle font-medium text-muted-foreground w-[120px]">Match Type</th>
                            <th className="h-10 px-4 align-middle font-medium text-muted-foreground w-[150px]">Step / Node</th>
                            <th className="h-10 px-4 align-middle font-medium text-muted-foreground w-[100px]">Method</th>
                            <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Endpoint / URL</th>
                            <th className="h-10 px-4 align-middle font-medium text-muted-foreground w-[80px]">Status</th>
                            <th className="h-10 px-4 align-middle font-medium text-muted-foreground text-right w-[80px]">Latency</th>
                        </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center gap-2">
                                        <Activity className="h-8 w-8 opacity-20" />
                                        <p>No API logs found within range of this session.</p>
                                        <p className="text-xs">This may happen if the AI answered from memory without external tools.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                        {logs.map((log: any) => (
                            <tr key={log.id} className="border-b transition-colors hover:bg-muted/50">
                                <td className="p-3 align-middle font-mono text-xs text-muted-foreground whitespace-nowrap">
                                    {new Date(log.created_at).toLocaleTimeString()}
                                </td>
                                <td className="p-3 align-middle">
                                    <Badge variant={log.match_type === 'Strict Link' || log.match_type === 'Thread Match' ? "default" : "secondary"} className="text-[10px] whitespace-nowrap">
                                        {log.match_type || "Time Match"}
                                    </Badge>
                                </td>
                                 <td className="p-3 align-middle font-semibold text-xs">
                                    {/* Useful for n8n debugging */}
                                    {log.node_name || "Unknown Step"}
                                </td>
                                <td className="p-3 align-middle font-bold text-xs">
                                    {log.method}
                                </td>
                                <td className="p-3 align-middle font-mono text-xs truncate max-w-[250px]" title={log.url}>
                                    {log.url || "-"}
                                </td>
                                <td className="p-3 align-middle">
                                    <Badge variant={log.status_code >= 400 ? "destructive" : "outline"} className="text-[10px]">
                                        {log.status_code || "N/A"}
                                    </Badge>
                                </td>
                                <td className="p-3 align-middle text-right font-mono text-xs">
                                    {log.duration_ms ? `${log.duration_ms}ms` : "-"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}