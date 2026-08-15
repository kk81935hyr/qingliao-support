import { FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

const contacts = [
  { id: "lin", name: "林晓", initials: "林", color: "#F4B8A8", online: true },
  { id: "momo", name: "Momo", initials: "M", color: "#F5CF7A", online: true },
  { id: "chen", name: "陈屿", initials: "陈", color: "#9ED8C4", online: false },
  { id: "yu", name: "余欢", initials: "余", color: "#C9A8EF", online: true },
];

export default function NewChatScreen() {
  const colors = useColors();
  return (
    <ScreenContainer className="px-5" edges={["top", "left", "right"]}>
      <View className="h-16 flex-row items-center"><Pressable onPress={() => router.back()} style={({ pressed }) => [pressed && { opacity: 0.55 }]} className="h-10 w-10 items-center justify-center"><IconSymbol name="arrow.left" size={24} color={colors.foreground} /></Pressable><Text className="text-[20px] font-bold text-foreground ml-2">新建聊天</Text></View>
      <Text className="text-[14px] text-muted mt-3 mb-4">选择一个联系人，开始轻松聊天</Text>
      <FlatList data={contacts} keyExtractor={(item) => item.id} renderItem={({ item }) => <Pressable onPress={() => router.push({ pathname: "/chat/[id]", params: { id: item.id, name: item.name, initials: item.initials, color: item.color, online: item.online ? "1" : "0" } } as any)} style={({ pressed }) => [pressed && { opacity: 0.7 }]} className="flex-row items-center py-3"><View className="h-12 w-12 rounded-2xl items-center justify-center" style={{ backgroundColor: item.color }}><Text className="text-[17px] font-bold" style={{ color: "#3C3150" }}>{item.initials}</Text></View><View className="ml-3"><Text className="text-[16px] font-semibold text-foreground">{item.name}</Text><Text className="text-[13px] text-muted mt-1">{item.online ? "在线" : "最近活跃"}</Text></View><IconSymbol name="chevron.right" size={21} color={colors.muted} style={{ marginLeft: "auto" }} /></Pressable>} />
    </ScreenContainer>
  );
}
