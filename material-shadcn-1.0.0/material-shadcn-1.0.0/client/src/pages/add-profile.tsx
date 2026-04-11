import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Loader2 } from "lucide-react";

const JSON_TEMPLATE = `{
  "id": "CUSTOM-001",
  "platform": "telegram",
  "username": "@new_suspect",
  "display_name": "Suspect Alpha",
  "bio": "DM for deals ❄️🔌 | ETH payments",
  "followers": 500,
  "phone": null,
  "wallet_addresses": ["0x742d35Cc6634C0532925a3b844Bc9e7595f2bD68"],
  "posts": [
    {
      "id": "CUSTOM-001-P01",
      "timestamp": "2026-04-01T20:00:00Z",
      "text": "❄️ Premium stock available. 3000/g. DM for menu. Fast delivery NCR 🔌",
      "media_type": "text",
      "engagement": {"likes": 0, "shares": 0}
    }
  ]
}`;

export default function AddProfile() {
  const { toast } = useToast();

  // Form state
  const [username, setUsername] = useState("");
  const [platform, setPlatform] = useState("telegram");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [followers, setFollowers] = useState(0);
  const [phone, setPhone] = useState("");
  const [wallets, setWallets] = useState("");
  const [postText, setPostText] = useState("");

  // JSON state
  const [jsonInput, setJsonInput] = useState(JSON_TEMPLATE);

  const addProfile = useMutation({
    mutationFn: (profile: unknown) => api.addProfile(profile),
    onSuccess: (data: any) => {
      toast({ title: "✅ Profile added!", description: data?.message || `Total profiles: ${data?.total_profiles}` });
      queryClient.invalidateQueries();
      // Reset form
      setUsername(""); setDisplayName(""); setBio(""); setFollowers(0); setPhone(""); setWallets(""); setPostText("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleFormSubmit = () => {
    if (!username || !displayName) {
      toast({ title: "Validation", description: "Username and Display Name are required.", variant: "destructive" });
      return;
    }
    const uid = `CUSTOM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const walletList = wallets.split(",").map(w => w.trim()).filter(Boolean);
    const posts = postText.trim() ? [{
      id: `${uid}-P01`,
      timestamp: new Date().toISOString(),
      text: postText.trim(),
      media_type: "text",
      engagement: { likes: 0, shares: 0 },
    }] : [];

    addProfile.mutate({
      id: uid,
      platform,
      username: username.startsWith("@") ? username : `@${username}`,
      display_name: displayName,
      bio,
      followers,
      phone: phone || null,
      wallet_addresses: walletList,
      posts,
    });
  };

  const handleJsonSubmit = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const profiles = Array.isArray(parsed) ? parsed : [parsed];
      profiles.forEach(p => addProfile.mutate(p));
    } catch (e: any) {
      toast({ title: "Invalid JSON", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-6">
      <Tabs defaultValue="form" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="form">📝 Form Input</TabsTrigger>
          <TabsTrigger value="json">📋 JSON Input</TabsTrigger>
        </TabsList>

        <TabsContent value="form">
          <Card className="border border-stone-200">
            <CardHeader><CardTitle className="text-sm font-medium text-stone-600">👤 Profile Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Username *</Label>
                  <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="@example_user" />
                </div>
                <div className="space-y-2">
                  <Label>Platform *</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="telegram">Telegram</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="twitter">Twitter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Display Name *</Label>
                  <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Example User" />
                </div>
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Input value={bio} onChange={e => setBio(e.target.value)} placeholder="Short bio..." />
                </div>
                <div className="space-y-2">
                  <Label>Followers</Label>
                  <Input type="number" value={followers} onChange={e => setFollowers(Number(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Phone (optional)</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91-XXXXX-XXXXX" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Wallet Addresses (comma separated)</Label>
                <Input value={wallets} onChange={e => setWallets(e.target.value)} placeholder="0x742d...bD68, 7xKXt...sAsU" />
              </div>
              <div className="space-y-2">
                <Label>Post Text</Label>
                <Textarea value={postText} onChange={e => setPostText(e.target.value)} placeholder="Enter post content..." className="min-h-20" />
              </div>
              <Button
                onClick={handleFormSubmit}
                disabled={addProfile.isPending}
                className="w-full bg-stone-800 hover:bg-stone-700 text-white"
              >
                {addProfile.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding...</> : <><PlusCircle className="h-4 w-4 mr-2" />Add Profile & Re-analyze</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="json">
          <Card className="border border-stone-200">
            <CardHeader><CardTitle className="text-sm font-medium text-stone-600">📋 Paste JSON Profile(s)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-stone-500">
                Paste a single profile or an array of profiles. Each must have at minimum:
                <code className="text-xs bg-stone-100 px-1 mx-1 rounded">id</code>,
                <code className="text-xs bg-stone-100 px-1 mx-1 rounded">platform</code>,
                <code className="text-xs bg-stone-100 px-1 mx-1 rounded">username</code>,
                <code className="text-xs bg-stone-100 px-1 mx-1 rounded">display_name</code>, and a
                <code className="text-xs bg-stone-100 px-1 mx-1 rounded">posts</code> array.
              </p>
              <Textarea
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
                className="min-h-64 font-mono text-xs"
              />
              <Button
                onClick={handleJsonSubmit}
                disabled={addProfile.isPending}
                className="w-full bg-stone-800 hover:bg-stone-700 text-white"
              >
                {addProfile.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</> : <><PlusCircle className="h-4 w-4 mr-2" />Submit JSON & Re-analyze</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
