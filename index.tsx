import { FlatList, Pressable, Text, View } from "react-native";
import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { getSupportInbox } from "@/lib/support-api";

export default function HomeScreen() {
  const colors = useColors();
  const [conversations, setConversations] = useState<Awaited<ReturnType<typeof getSupportInbox>>["conversations"]>([]);
  const refreshInbox = useCallback(async () => {
    setConversations((await getSupportInbox()).conversations);
  }, []);
  useEffect(() => {
    refreshInbox().catch(() => undefined);
    const timer = setInterval(() => refreshInbox().catch(() => undefined), 2500);
    return () => clearInterval(timer);
  }, [refreshInbox]);

  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <View className="pt-3 pb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-[13px] font-semibold tracking-[1.5px] text-primary">QINGLIAO</Text>
          <Text className="text-[30px] font-bold text-foreground mt-1">客服</Text>
        </View>
        <Pressable onPress={() => refreshInbox()} style={({ pressed }) => [{ backgroundColor: colors.primary }, pressed && { opacity: 0.78, transform: [{ scale: 0.96 }] }]} className="h-12 w-12 rounded-2xl items-center justify-center">
          <IconSymbol name="arrow.clockwise" size={23} color="#FFFFFF" />
        </Pressable>
      </View>

      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-[17px] font-bold text-foreground">访客咨询</Text>
        <Text className="text-[13px] text-muted">{conversations.length} 个会话</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push({ pathname: "/agent/[token]", params: { token: item.visitorToken, label: item.visitorLabel } } as any)} style={({ pressed }) => [pressed && { opacity: 0.72 }]} className="flex-row items-center py-3">
            <View className="h-[54px] w-[54px] rounded-[19px] items-center justify-center" style={{ backgroundColor: "#E5E0FF" }}>
              <Text className="text-[19px] font-bold" style={{ color: "#4E43C8" }}>{item.visitorLabel.slice(-4)}</Text>
              <View className="absolute right-[-1px] bottom-[-1px] h-4 w-4 rounded-full border-[3px] border-background" style={{ backgroundColor: colors.success }} />
            </View>
            <View className="flex-1 ml-3.5 min-w-0">
              <View className="flex-row items-center justify-between">
                <Text className="text-[16px] font-semibold text-foreground" numberOfLines={1}>{item.visitorLabel}</Text>
                <Text className="text-[12px] text-muted ml-2">{new Date(item.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
              </View>
              <View className="flex-row items-center justify-between mt-1">
                <Text className="flex-1 text-[14px] text-muted" numberOfLines={1}>{item.status === "open" ? "等待客服回复" : "会话已结束"}</Text>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<View className="items-center pt-16"><View className="h-12 w-12 rounded-2xl bg-surface items-center justify-center"><IconSymbol name="headphones" size={23} color={colors.primary} /></View><Text className="text-[16px] font-semibold text-foreground mt-4">还没有访客咨询</Text><Text className="text-[14px] text-muted mt-2">网页访客开始咨询后会显示在这里</Text></View>}
      />
    </ScreenContainer>
  );
}
