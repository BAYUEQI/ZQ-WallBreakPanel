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
### 4. KV 绑定
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 点击**存储和数据库**，再点击**Create Instance**，命名空间名称为**wbp**，点击**创建**

### 5. 部署到 Cloudflare 
#### 1. 部署到 Cloudflare Workes

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 点击**计算(Workers)**,再点击**Workers和Pages** 
3. 点击 右上角的**创建**，选择**Workers**
4. 选择 **从Hello World!开始**，worker名称任意，点击**部署**，再点击**编辑代码**
5. 将 `dist/worker.js` 的内容复制到编辑器中
6. 点击 **部署**，完成后点击**左上角的返回箭头**
7. 在新界面点击 **设置**，选择**变量和机密**，点击**添加**，依据[环境变量](#6-环境变量)（可访问`https://你的worker域名/secrets`生成密钥）；再依次点击**绑定**，**添加绑定**，**KV命名空间**，**添加绑定**，变量名称填**wbp**，KV命名空间选**wbp**，最后点击**添加绑定**
8. 在重新上传一次文件，重新部署一次
9. 接着访问`https://你的workers域名/panel`
#### 2. 部署到 Cloudflare Pages

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 点击**计算(Workers)**,再点击**Workers和Pages** 
3. 点击 右上角的**创建**，选择**Pages**
4. 选择 **使用直接上传**,page名称任意，点击**创建项目**，再上传`dist/worker.zip`,再点击**部署站点**，最后点击**继续处理项目**
5. 在新界面点击 **设置**，选择**变量和机密**，点击**添加**，依据[环境变量](#6-环境变量)配置变量（可访问`https://你的page域名/secrets`生成密钥）；再依次点击**绑定**，**添加**，**KV命名空间**，变量名称填**wbp**，KV命名空间选**wbp**，最后点击**保存**
8. 接着访问`https://你的page域名/panel`

### 6. 环境变量

| 变量名 | 说明 | 示例值 | 用途 |
|--------|------|--------|------|
| **UUID(必填)** | VLESS UUID | `12345678-1234-1234-1234-123456789abc` |用于 VLESS 协议的身份验证 |
| **TR_PASS(必填)** | Trojan 密码 | `your_trojan_password` |用于 Trojan 协议的身份验证 |
| **PROXY_IP** | 代理 IP 或域名 (VLESS, Trojan) | `1.1.1.1` 或 `proxy.example.com` |VLESS 和 Trojan 的代理服务器地址 |
| **SUB_PATH** | 订阅链接路径 | `/sub` |生成订阅链接的路径前缀 |
| **FALLBACK** | 备用域名 (VLESS, Trojan) | `speed.cloudflare.com` |当主域名不可用时的备用地址 |
| **DOH_URL** | DNS over HTTPS URL | `https://cloudflare-dns.com/dns-query` |用于 DNS 查询的 DoH 服务器地址 |

### 7. 页面地址
- 配置页面地址：`https://你的worker或者page域名/panel`
- 登录页面地址：`https://你的worker或者page域名/login`
- 密钥生成地址: `https://你的worker或者page域名/secrets`




---


