<h1 align="center">💦 ZQ-WallBreakPanel</h1>

## 项目简介

ZQ-WallBreakPanel 是一个免费的、安全的、私密的用户面板，提供 **VLESS**、**Trojan** 和 **Warp** 配置。即使在域名或 Warp 服务被 ISP 封锁的情况下，也能确保连接性。


## 主要功能

1. **免费且私密**: 无任何费用，服务器私密运行
2. **直观面板**: 简洁易用的导航、配置界面
3. **多协议支持**: 提供 VLESS、Trojan 和 Wireguard (Warp) 协议
4. **Warp Pro 配置**: 针对关键情况的优化 Warp 配置
5. **Fragment 支持**: 支持 Fragment 功能，适用于关键网络环境
6. **全面路由规则**: 绕过伊朗/中国/俄罗斯和局域网，屏蔽 QUIC、色情、广告、恶意软件、钓鱼网站，同时绕过制裁
7. **链式代理**: 能够添加链式代理来修复 IP
8. **广泛客户端兼容**: 为 Xray、Sing-box 和 Clash-Mihomo 核心客户端提供订阅链接
9. **密码保护面板**: 提供安全私密的面板，支持密码保护
10. **完全可定制**: 支持设置优选 IP 域名、代理 IP、DNS 服务器、选择端口和协议、Warp 端点等

## 部署步骤

### 1. 克隆项目
```bash
git clone https://github.com/BAYUEQI/ZQ-WallBreakPanel.git
cd ZQ-WallBreakPanel
```

### 2. 安装依赖
```bash
npm install
```

### 3. 构建项目
```bash
npm run build
```

构建完成后，会在 `dist/` 目录下生成以下文件：
- `worker.js` - 主要的 Worker 代码文件
- `worker.zip` - 压缩包版本，便于部署

### 4. 部署到 Cloudflare Workers

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** 页面
3. 点击 **Create application**
4. 选择 **Create Worker**
5. 将 `dist/worker.js` 的内容复制到编辑器中
6. 点击 **Deploy**

### 5. 配置环境变量和 KV 绑定

#### 环境变量
在 Cloudflare Workers 的设置页面，添加以下环境变量：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| **UUID(必填)** | VLESS UUID | `12345678-1234-1234-1234-123456789abc` |
| **TR_PASS(必填)** | Trojan 密码 | `your_trojan_password` |
| **PROXY_IP** | 代理 IP 或域名 (VLESS, Trojan) | `1.1.1.1` 或 `proxy.example.com` |
| **SUB_PATH** | 订阅链接路径 | `/sub` |
| **FALLBACK** | 备用域名 (VLESS, Trojan) | `speed.cloudflare.com` |
| **DOH_URL** | DNS over HTTPS URL | `https://cloudflare-dns.com/dns-query` |

#### KV 绑定
1. 在 Cloudflare Dashboard 中创建一个新的 KV 命名空间
2. 在 Workers 设置页面的 **Variables** 标签页中
3. 添加 KV 绑定：
   - **Variable name**: `wbp`
   - **KV namespace**: 选择你创建的 KV 命名空间

### 6. 访问面板

部署完成后，访问你的 Worker URL：
- 面板地址：`https://your-worker.your-subdomain.workers.dev/panel`
- 登录地址：`https://your-worker.your-subdomain.workers.dev/login`
- 密钥生成地址: `https://your-worker.your-subdomain.workers.dev/secrets`

## 限制说明

1. **UDP 传输**: Workers 上的 VLESS 和 Trojan 协议无法正确处理 **UDP**，默认禁用（影响 Telegram 视频通话等功能），UDP DNS 也不支持。默认启用 DoH 以增强安全性。
2. **请求限制**: 每个 Worker 每天支持 10 万次请求，适用于 2-3 个用户。可以使用自定义个人域名来绕过 VLESS/Trojan 的限制，或选择无限制的 Warp 配置。

## 支持的客户端

| 客户端 | 版本要求 | 分片 支持 | Warp Pro 支持 |
|--------|----------|---------------|---------------|
| **v2rayNG** | 1.10.2 或更高 | ✅ | ✅ |
| **v2rayN** | 7.12.5 或更高 | ✅ | ✅ |
| **v2rayN-PRO** | 1.9 或更高 | ✅ | ✅ |
| **Husi** | - | ✅ | ❌ |
| **Sing-box** | 1.12.0 或更高 | ✅ | ❌ |
| **Streisand** | 1.6.48 或更高 | ✅ | ✅ |
| **V2Box** | - | ❌ | ❌ |
| **Shadowrocket** | - | ❌ | ❌ |
| **Nekoray** | - | ✅ | ❌ |
| **Hiddify** | 2.5.7 或更高 | ✅ | ✅ |
| **MahsaNG** | 13 或更高 | ✅ | ✅ |
| **Clash Meta** | - | ❌ | ❌ |
| **Clash Verge Rev** | - | ❌ | ❌ |
| **FLClash** | - | ❌ | ❌ |
| **AmneziaVPN** | - | ❌ | ✅ |
| **WG Tunnel** | - | ❌ | ✅ |

## 环境变量详解

| 变量名 | 用途 | 说明 |
|--------|------|------|
| **UUID** | VLESS UUID | 用于 VLESS 协议的身份验证 |
| **TR_PASS** | Trojan 密码 | 用于 Trojan 协议的身份验证 |
| **PROXY_IP** | 代理 IP 或域名 | VLESS 和 Trojan 的代理服务器地址 |
| **SUB_PATH** | 订阅链接路径 | 生成订阅链接的路径前缀 |
| **FALLBACK** | 备用域名 | 当主域名不可用时的备用地址 |
| **DOH_URL** | DNS over HTTPS | 用于 DNS 查询的 DoH 服务器地址 |

---


