import { useLocalSearchParams, router } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { SupportChat } from "@/components/support-chat";

export default function AgentConversationScreen() {
  const { token, label } = useLocalSearchParams<{ token: string; label?: string }>();
  return <ScreenContainer edges={["top", "left", "right", "bottom"]}><SupportChat visitorToken={token} sender="agent" title={label ?? "访客咨询"} subtitle="客服对话" onBack={() => router.back()} /></ScreenContainer>;
}
