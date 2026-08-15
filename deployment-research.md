# Netlify 与 Android 推送实施要点

当前项目的网页可以导出为 Expo Web 单页应用，但匿名客服的消息、图片和通知仍需独立的服务器端能力。Netlify Functions 可承载无服务器接口；数据库与图片文件应使用外部持久化服务，避免依赖临时文件系统。

Netlify 的敏感配置应在项目控制台的环境变量设置中完成，供 Functions 运行时读取；不要把服务角色密钥写入 `netlify.toml` 或前端代码。每次更新运行时环境变量后应重新部署。

Expo Android 远程通知需要在应用内获取 Expo Push Token，并完成 Android FCM 通知凭证配置。网页有新访客消息时，后端再通过 Expo Push Service 向已注册的客服设备发送通知。

Supabase 的公开 Publishable Key 可供前端使用，但具有完整数据访问权限的 Secret Key 只能保存在受控服务端。因此，Netlify Functions 将保存 Supabase Secret Key，并负责创建会话、读写消息、上传图片和触发客服通知；网页与 Android 应用只调用这些受限接口。

Expo Push Service 由后端使用客户端注册得到的 Expo Push Token 发送消息。生产环境还应保存推送回执，并在回执报告 `DeviceNotRegistered` 时停用失效设备令牌。

## 参考来源

- [Expo Web 发布指南](https://docs.expo.dev/guides/publishing-websites/)
- [Netlify Functions 环境变量](https://docs.netlify.com/build/functions/environment-variables/)
- [Supabase API Keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Expo Push Notifications Setup](https://docs.expo.dev/push-notifications/push-notifications-setup/)
- [Expo Push Notifications Sending](https://docs.expo.dev/push-notifications/sending-notifications/)
