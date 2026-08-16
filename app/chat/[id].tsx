import { useMemo, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

type Message = { id: string; text: string; mine: boolean; time: string };
const seed: Message[] = [
  { id: "1", text: "嗨，最近过得怎么样？", mine: false, time: "10:36" },
  { id: "2", text: "挺好的！最近在做一个很有趣的新项目。", mine: true, time: "10:38" },
  { id: "3", text: "听起来不错，晚点一起喝咖啡吗？", mine: false, time: "10:42" },
];

export default function ChatDetailScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ name?: string; initials?: string; color?: string; online?: string }>();
  const [messages, setMessages] = useState(seed);
  const [draft, setDraft] = useState("");
  const name = params.name ?? "新会话";
  const canSend = draft.trim().length > 0;
  const subtitle = params.online === "1" ? "在线" : "最近活跃";
  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setMessages((current) => [...current, { id: String(Date.now()), text, mine: true, time: "刚刚" }]);
    setDraft("");
  };
  const listData = useMemo(() => messages, [messages]);

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}>
        <View className="h-[64px] px-4 flex-row items-center border-b border-border">
          <Pressable onPress={() => router.back()} style={({ pressed }) => [pressed && { opacity: 0.55 }]} className="h-10 w-10 items-center justify-center">
            <IconSymbol name="arrow.left" size={24} color={colors.foreground} />
          </Pressable>
          <View className="h-10 w-10 rounded-[14px] items-center justify-center ml-1" style={{ backgroundColor: params.color ?? "#A9B7F8" }}><Text className="font-bold" style={{ color: "#3C3150" }}>{params.initials ?? "聊"}</Text></View>
          <View className="ml-3"><Text className="text-[16px] font-bold text-foreground">{name}</Text><Text className="text-[12px] text-muted mt-0.5">{subtitle}</Text></View>
          <Pressable onPress={() => {}} style={({ pressed }) => [pressed && { opacity: 0.55 }]} className="ml-auto h-10 w-10 items-center justify-center"><IconSymbol name="more.horiz" size={23} color={colors.foreground} /></Pressable>
        </View>

        <FlatList data={listData} keyExtractor={(item) => item.id} className="flex-1 px-4" contentContainerStyle={{ paddingTop: 22, paddingBottom: 18 }} showsVerticalScrollIndicator={false} renderItem={({ item, index }) => (
          <View className={`mb-4 ${item.mine ? "items-end" : "items-start"}`}>
            {index === 0 && <Text className="text-[12px] text-muted mb-4 self-center">今天</Text>}
            <View className={`max-w-[82%] px-4 py-3 rounded-[20px] ${item.mine ? "rounded-br-[6px] bg-primary" : "rounded-bl-[6px] bg-surface"}`}>
              <Text className={`text-[15px] leading-[21px] ${item.mine ? "text-white" : "text-foreground"}`}>{item.text}</Text>
            </View>
            <View className="flex-row items-center mt-1 px-1"><Text className="text-[11px] text-muted">{item.time}</Text>{item.mine && <IconSymbol name="checkmark" size={13} color={colors.primary} style={{ marginLeft: 4 }} />}</View>
          </View>
        )} />

        <View className="px-4 pt-2 pb-2 flex-row items-end border-t border-border" style={{ backgroundColor: colors.background }}>
          <Pressable onPress={() => {}} style={({ pressed }) => [pressed && { opacity: 0.55 }]} className="h-11 w-10 items-center justify-center"><IconSymbol name="paperclip" size={22} color={colors.muted} /></Pressable>
          <View className="min-h-11 max-h-28 flex-1 rounded-[18px] px-4 py-2 justify-center" style={{ backgroundColor: colors.surface }}><TextInput value={draft} onChangeText={setDraft} placeholder="输入消息..." placeholderTextColor={colors.muted} multiline className="text-[15px] text-foreground" returnKeyType="send" onSubmitEditing={send} /></View>
          <Pressable onPress={send} disabled={!canSend} style={({ pressed }) => [{ backgroundColor: canSend ? colors.primary : colors.surface }, pressed && canSend && { opacity: 0.8, transform: [{ scale: 0.95 }] }]} className="h-11 w-11 rounded-full ml-2 items-center justify-center"><IconSymbol name="paperplane.fill" size={19} color={canSend ? "#FFFFFF" : colors.muted} /></Pressable>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
