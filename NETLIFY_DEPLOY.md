# 轻聊客服系统：Netlify 发布说明

## 1. 发布网页和客服接口

在 Netlify 中从 GitHub 导入本项目，构建设置使用仓库内的 `netlify.toml`：构建命令是 `npx expo export -p web`，发布目录是 `dist`，Functions 目录是 `netlify/functions`。

在 Netlify 的 **Site configuration → Environment variables** 中添加：

| 名称 | 值 | 用途 |
| --- | --- | --- |
| `SUPABASE_URL` | Supabase Project URL | 服务器定位 Supabase 项目 |
| `SUPABASE_SECRET_KEY` | Supabase Secret Key | Netlify Functions 服务端读写客服数据和图片 |

不要把 `SUPABASE_SECRET_KEY` 放到网页环境变量（例如 `EXPO_PUBLIC_*`）、GitHub 或 Android App 中。设置完成后重新部署一次，Functions 才会读取新的变量。

## 2. Supabase 初始化

在 Supabase **SQL Editor** 中运行 `supabase/schema.sql`。该脚本创建客服会话、消息、推送设备令牌表，并创建 `support-images` 图片存储桶。图片限制为 JPG、PNG、WebP，单张最大 1.5MB。

## 3. Android App 连接已发布的客服接口

Netlify 发布成功后，复制站点地址，例如 `https://your-site.netlify.app`。在 Android App 的构建环境中设置：

```text
EXPO_PUBLIC_SUPPORT_API_URL=https://your-site.netlify.app
```

然后重新生成 Android 安装包。网页端会自动使用同站点的 `/api/support`；Android 端使用该环境变量访问同一个客服接口。

## 4. Android 推送通知

代码已经完成通知频道、权限请求、Expo Push Token 注册、访客消息触发通知和通知点击跳转到对应客服会话。要在真实 Android 设备上启用远程推送，还需要为 Expo 项目配置 EAS `projectId` 和 Android FCM 凭证，并通过开发构建或发布构建安装 App。Expo Go Android 不支持 SDK 53 及以上的远程推送测试。

推送服务端使用已注册的 Expo Push Token 调用 Expo Push Service。生产使用时应定期处理 Push Receipt，并停用 `DeviceNotRegistered` 的令牌。

## 5. 最小验证流程

发布后打开 `https://your-site.netlify.app/support`，点击“开始咨询”并发送文字；在 Android App 收件箱中确认出现新会话并回复。再发送一张小于 1.5MB 的 JPG 或 PNG，确认两端都能显示图片。Android 设备需允许通知，且 App 必须使用包含推送凭证的开发构建或发布构建。
