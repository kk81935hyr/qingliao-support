import { useCallback, useEffect, useState } from "react";
import { FlatList, Image, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { getApiBaseUrl } from "@/constants/oauth";
import { useColors } from "@/hooks/use-colors";
import { getSupportMessages, sendSupportMessage } from "@/lib/support-api";

type SupportChatProps = {
  visitorToken: string;
  sender: "visitor" | "agent";
  title: string;
  subtitle: string;
  onBack?: () => void;
};

function resolveImageUrl(imageUrl: string) {
  return imageUrl.startsWith("http") ? imageUrl : `${getApiBaseUrl()}${imageUrl}`;
}

export function SupportChat({ visitorToken, sender, title, subtitle, onBack }: SupportChatProps) {
  const colors = useColors();
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Awaited<ReturnType<typeof getSupportMessages>>["messages"]>([]);
  const [isSending, setIsSending] = useState(false);

  const refreshMessages = useCallback(async () => {
    try {
      const result = await getSupportMessages(visitorToken);
      setMessages(result.messages);
    } finally {
    }
  }, [visitorToken]);

  useEffect(() => {
    refreshMessages().catch(() => undefined);
    const timer = setInterval(() => refreshMessages().catch(() => undefined), 2500);
    return () => clearInterval(timer);
  }, [refreshMessages]);

  const canSend = draft.trim().length > 0 && !isSending;

  const sendText = () => {
    const body = draft.trim();
    if (!body || isSending) return;
    setIsSending(true);
    sendSupportMessage({ visitorToken, sender, body })
      .then(() => { setDraft(""); return refreshMessages(); })
      .finally(() => setIsSending(false));
  };

  const sendImage = async () => {
    if (isSending) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
      allowsEditing: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset.base64) return;
    const imageMime = asset.mimeType === "image/png" || asset.mimeType === "image/webp" ? asset.mimeType : "image/jpeg";
    setIsSending(true);
    sendSupportMessage({ visitorToken, sender, imageBase64: asset.base64, imageMime })
      .then(() => refreshMessages())
      .finally(() => setIsSending(false));
  };

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View className="h-16 flex-row items-center px-4 border-b border-border bg-background">
        {onBack ? <Pressable onPress={onBack} style={({ pressed }) => [pressed && { opacity: 0.55 }]} className="h-10 w-10 items-center justify-center -ml-2"><IconSymbol name="arrow.left" size={23} color={colors.foreground} /></Pressable> : null}
        <View className={onBack ? "ml-2" : ""}>
          <Text className="text-[16px] font-bold text-foreground">{title}</Text>
          <Text className="text-[12px] text-muted mt-0.5">{subtitle}</Text>
        </View>
        <View className="ml-auto flex-row items-center"><View className="h-2 w-2 rounded-full bg-success mr-1.5" /><Text className="text-[12px] text-muted">在线</Text></View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => String(item.id)}
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 20, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<View className="flex-1 items-center justify-center pb-10"><View className="h-12 w-12 rounded-2xl bg-surface items-center justify-center"><IconSymbol name="headphones" size={23} color={colors.primary} /></View><Text className="text-[16px] font-semibold text-foreground mt-4">开始对话吧</Text><Text className="text-[13px] text-muted mt-1">客服通常会很快回复</Text></View>}
        renderItem={({ item }) => {
          const mine = item.sender === sender;
          return (
            <View className={`mb-4 ${mine ? "items-end" : "items-start"}`}>
              <View className={`max-w-[84%] overflow-hidden rounded-[20px] px-4 py-3 ${mine ? "rounded-br-[6px] bg-primary" : "rounded-bl-[6px] bg-surface"}`}>
                {item.imageUrl ? <Image source={{ uri: resolveImageUrl(item.imageUrl) }} resizeMode="cover" className="h-44 w-52 rounded-xl mb-2" /> : null}
                {item.body ? <Text className={`text-[15px] leading-[21px] ${mine ? "text-white" : "text-foreground"}`}>{item.body}</Text> : null}
              </View>
              <Text className="text-[11px] text-muted mt-1 px-1">{new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
            </View>
          );
        }}
      />

      <View className="flex-row items-end border-t border-border bg-background px-4 pt-2 pb-3">
        <Pressable onPress={sendImage} disabled={isSending} style={({ pressed }) => [pressed && { opacity: 0.55 }]} className="h-11 w-10 items-center justify-center"><IconSymbol name="photo" size={22} color={colors.muted} /></Pressable>
        <View className="min-h-11 max-h-28 flex-1 rounded-[18px] px-4 py-2 justify-center bg-surface"><TextInput value={draft} onChangeText={setDraft} placeholder="输入消息..." placeholderTextColor={colors.muted} multiline className="text-[15px] text-foreground" returnKeyType="send" onSubmitEditing={sendText} /></View>
        <Pressable onPress={sendText} disabled={!canSend} style={({ pressed }) => [{ backgroundColor: canSend ? colors.primary : colors.surface }, pressed && canSend && { opacity: 0.8, transform: [{ scale: 0.96 }] }]} className="h-11 w-11 rounded-full items-center justify-center ml-2"><IconSymbol name="paperplane.fill" size={18} color={canSend ? "#FFFFFF" : colors.muted} /></Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
