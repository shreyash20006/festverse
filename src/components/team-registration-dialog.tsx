import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createTeamAndRegister, joinTeamWithInviteCode } from "@/lib/team-registration.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Users, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TeamRegistrationDialogProps {
  eventId: string;
  eventTitle: string;
  minTeamSize: number;
  maxTeamSize: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (ticketId: string) => void;
}

export function TeamRegistrationDialog({
  eventId,
  eventTitle,
  minTeamSize,
  maxTeamSize,
  isOpen,
  onOpenChange,
  onSuccess,
}: TeamRegistrationDialogProps) {
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [submitting, setSubmitting] = useState(false);

  // Create Team state
  const [teamName, setTeamName] = useState("");
  const [leaderPrn, setLeaderPrn] = useState("");
  const [leaderPhone, setLeaderPhone] = useState("");
  const [memberPrns, setMemberPrns] = useState<string[]>([""]); // Starts with one teammate slot

  // Join Team state
  const [inviteCode, setInviteCode] = useState("");
  const [joinPrn, setJoinPrn] = useState("");
  const [joinPhone, setJoinPhone] = useState("");

  const createTeamFn = useServerFn(createTeamAndRegister);
  const joinTeamFn = useServerFn(joinTeamWithInviteCode);

  const handleAddMemberSlot = () => {
    if (memberPrns.length + 1 >= maxTeamSize) {
      toast.error(`Maximum team size is ${maxTeamSize} (including you).`);
      return;
    }
    setMemberPrns([...memberPrns, ""]);
  };

  const handleRemoveMemberSlot = (index: number) => {
    const newPrns = memberPrns.filter((_, i) => i !== index);
    setMemberPrns(newPrns.length === 0 ? [""] : newPrns);
  };

  const handleMemberPrnChange = (index: number, value: string) => {
    const newPrns = [...memberPrns];
    newPrns[index] = value;
    setMemberPrns(newPrns);
  };

  const handleCreateTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !leaderPrn.trim()) {
      toast.error("Team Name and Leader PRN are required.");
      return;
    }

    const filteredMemberPrns = memberPrns.filter((prn) => prn.trim() !== "");
    const totalSize = 1 + filteredMemberPrns.length;

    if (totalSize < minTeamSize) {
      toast.error(`Minimum team size is ${minTeamSize}. Please add more members.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await createTeamFn({
        data: {
          eventId,
          teamName,
          leaderPrn,
          leaderPhone: leaderPhone || undefined,
          memberPrns: filteredMemberPrns,
        },
      });
      toast.success(`Team "${teamName}" created! Team Code: ${res.inviteCode}`);
      onOpenChange(false);
      onSuccess(res.ticketId);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create team");
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !joinPrn.trim()) {
      toast.error("Invite Code and PRN are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await joinTeamFn({
        data: {
          eventId,
          inviteCode: inviteCode.trim().toUpperCase(),
          prn: joinPrn,
          phone: joinPhone || undefined,
        },
      });
      toast.success("Successfully joined the team!");
      onOpenChange(false);
      onSuccess(res.ticketId);
    } catch (err: any) {
      toast.error(err?.message || "Failed to join team");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border border-border bg-card p-6 shadow-elevated">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold">Register for {eventTitle}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            This is a team event (Min: {minTeamSize}, Max: {maxTeamSize} members).
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted p-1">
            <TabsTrigger value="create" className="rounded-lg text-xs font-semibold cursor-pointer">
              <Users className="mr-1.5 h-3.5 w-3.5" /> Create Team
            </TabsTrigger>
            <TabsTrigger value="join" className="rounded-lg text-xs font-semibold cursor-pointer">
              <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Join Team
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-4">
            <form onSubmit={handleCreateTeamSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="teamName" className="text-xs font-semibold">Team Name</Label>
                <Input
                  id="teamName"
                  placeholder="e.g. Code Wizards"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="rounded-xl h-10 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="leaderPrn" className="text-xs font-semibold">Your PRN (Leader)</Label>
                  <Input
                    id="leaderPrn"
                    placeholder="e.g. TGP24001"
                    value={leaderPrn}
                    onChange={(e) => setLeaderPrn(e.target.value)}
                    className="rounded-xl h-10 text-sm font-mono"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="leaderPhone" className="text-xs font-semibold">Your Phone</Label>
                  <Input
                    id="leaderPhone"
                    placeholder="e.g. +91 ..."
                    value={leaderPhone}
                    onChange={(e) => setLeaderPhone(e.target.value)}
                    className="rounded-xl h-10 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground">Teammate PRNs (Added Directly)</Label>
                  {memberPrns.length + 1 < maxTeamSize && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddMemberSlot}
                      className="h-7 rounded-lg text-[10px] px-2"
                    >
                      <Plus className="mr-1 h-3 w-3" /> Add Slot
                    </Button>
                  )}
                </div>

                <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                  {memberPrns.map((prn, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        placeholder={`Member ${idx + 2} PRN (e.g. TGP24002)`}
                        value={prn}
                        onChange={(e) => handleMemberPrnChange(idx, e.target.value)}
                        className="rounded-xl h-9 text-xs font-mono flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMemberSlot(idx)}
                        className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  * Teammates added by PRN will be registered immediately. Teammates not added here can join later using your team's invite code.
                </p>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-10 rounded-full bg-gradient-brand text-sm font-semibold text-white mt-2 shadow-glow"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Creating...
                  </>
                ) : (
                  "Create & Register"
                )}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="join" className="mt-4">
            <form onSubmit={handleJoinTeamSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="inviteCode" className="text-xs font-semibold">Team Invite Code</Label>
                <Input
                  id="inviteCode"
                  placeholder="e.g. TEAM-A1B2C3"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="rounded-xl h-10 text-sm font-mono tracking-widest uppercase"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="joinPrn" className="text-xs font-semibold">Your PRN</Label>
                  <Input
                    id="joinPrn"
                    placeholder="e.g. TGP24002"
                    value={joinPrn}
                    onChange={(e) => setJoinPrn(e.target.value)}
                    className="rounded-xl h-10 text-sm font-mono"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="joinPhone" className="text-xs font-semibold">Your Phone</Label>
                  <Input
                    id="joinPhone"
                    placeholder="e.g. +91 ..."
                    value={joinPhone}
                    onChange={(e) => setJoinPhone(e.target.value)}
                    className="rounded-xl h-10 text-sm"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-10 rounded-full bg-gradient-brand text-sm font-semibold text-white mt-4 shadow-glow"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Joining...
                  </>
                ) : (
                  "Join Team"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
