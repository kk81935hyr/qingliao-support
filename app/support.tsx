import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { SupportChat } from "@/components/support-chat";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { getSupportMessages, startSupportConversation } from "@/lib/support-api";

const VISITOR_TOKEN_KEY = "qingliao_support_visitor_token";

export default function SupportScreen() {
  const colors = useColors();
  const [visitorToken, setVisitorToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState(false);
  const startConversation = async () => {
    if (isStarting) return;
    setIsStarting(true);
    setStartError(false);
    try {
      const { conversation } = await startSupportConversation();
      await AsyncStorage.setItem(VISITOR_TOKEN_KEY, conversation.visitorToken);
      setVisitorToken(conversation.visitorToken);
    } catch {
      setStartError(true);
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await AsyncStorage.getItem(VISITOR_TOKEN_KEY);
      if (!stored) {
        if (active) { setVisitorToken(null); setChecking(false); }
        return;
      }
      try {
        const result = await getSupportMessages(stored);
        if (active) setVisitorToken(result.conversation ? stored : null);
        if (!result.conversation) await AsyncStorage.removeItem(VISITOR_TOKEN_KEY);
      } catch {
        if (active) setVisitorToken(stored);
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (checking) return <ScreenContainer className="items-center justify-center"><ActivityIndicator color={colors.primary} /></ScreenContainer>;
  const recoverConversation = async () => {
    await AsyncStorage.removeItem(VISITOR_TOKEN_KEY);
    setVisitorToken(null);
    await startConversation();
  };

  if (visitorToken) return <ScreenContainer edges={["top", "left", "right", "bottom"]}><SupportChat visitorToken={visitorToken} sender="visitor" title="在线咨询" subtitle="匿名客服 · 无需登录" onSessionInvalid={recoverConversation} /></ScreenContainer>;

  return (
    <ScreenContainer className="items-center justify-center px-7" edges={["top", "left", "right", "bottom"]}>
      <View className="w-full max-w-md rounded-[28px] bg-surface p-7 items-center" style={Platform.OS === "web" ? { boxShadow: "0 18px 50px rgba(51, 43, 122, 0.12)" } : undefined}>
        <View className="h-16 w-16 rounded-[22px] bg-primary items-center justify-center"><IconSymbol name="headphones" size={31} color="#FFFFFF" /></View>
        <Text className="text-[26px] font-bold text-foreground mt-6">需要帮助吗？</Text>
        <Text className="text-[15px] leading-[22px] text-muted text-center mt-3">点击下方按钮即可与客服聊天。无需注册，也不用留下联系方式。</Text>
        <Pressable onPress={startConversation} disabled={isStarting} style={({ pressed }) => [{ width: "100%", height: 52, borderRadius: 16, backgroundColor: colors.primary, marginTop: 28, alignItems: "center", justifyContent: "center" }, pressed && { opacity: 0.83, transform: [{ scale: 0.98 }] }]}><Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>{isStarting ? "正在连接..." : "开始咨询"}</Text></Pressable>
        {startError ? <Text className="text-error text-[13px] mt-3">暂时无法创建会话，请稍后重试。</Text> : null}
      </View>
      <Text className="text-[12px] text-muted mt-5">发送图片请控制在 1.5MB 以内</Text>
    </ScreenContainer>
  );
}
