# Weather MCP Server (JavaScript ES Modules)

一个使用纯 JavaScript ES Modules 构建的天气 MCP 服务器，支持多种传输方式。

<a href="https://glama.ai/mcp/servers/@630156145/weather-server-javascript">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@630156145/weather-server-javascript/badge" alt="Weather Server MCP server" />
</a>

## 功能特性

- 获取美国各州的天气警报信息
- 获取指定经纬度的天气预报
- 支持 stdio 和 HTTP/SSE 两种传输方式
- 使用美国国家气象局 (NWS) API
- ✨ **纯 JavaScript** - 无需编译步骤，直接运行

## 安装与设置

1. 克隆或下载项目
2. 安装依赖：
   ```bash
   npm install
   ```

## 使用方式

### 1. stdio 传输（推荐用于本地开发）

```bash
# 相对路径运行
npm start
# 或直接运行
node index.mjs

# 绝对路径运行（推荐用于MCP客户端配置）
node /完整/路径/到/weather-server-javascript/index.mjs

# 示例绝对路径
node /Users/username/projects/weather-server-javascript/index.mjs
# 或在Windows上
node C:\Users\username\projects\weather-server-javascript\index.mjs
```

**获取当前项目绝对路径：**
```bash
# 在项目目录下运行，获取绝对路径
pwd
# 输出类似：/Users/username/projects/weather-server-javascript

# 完整的绝对路径命令
node $(pwd)/index.mjs
```

### 2. HTTP/SSE 传输（支持远程连接）

```bash
npm run serve
```

这将启动一个 HTTP 服务器在端口 8080，提供以下端点：

- **SSE 端点**: `http://localhost:8080/sse`
  - 用于建立 Server-Sent Events 连接
  - 支持实时双向通信

- **HTTP 端点**: `http://localhost:8080/mcp`  
  - 用于标准的 HTTP POST 请求
  - 支持批量请求

## 可用工具

### get-alerts
获取指定州的天气警报信息

**参数:**
- `state` (string): 两位州代码，如 "CA"、"NY"

**示例:**
```json
{
  "name": "get-alerts",
  "arguments": {
    "state": "CA"
  }
}
```

### get-forecast
获取指定经纬度的天气预报

**参数:**
- `latitude` (number): 纬度 (-90 到 90)
- `longitude` (number): 经度 (-180 到 180)

**示例:**
```json
{
  "name": "get-forecast", 
  "arguments": {
    "latitude": 37.7749,
    "longitude": -122.4194
  }
}
```

## 客户端连接示例

### 使用 curl 测试 SSE 连接

```bash
# 建立 SSE 连接
curl -X GET http://localhost:8080/sse
```

### 运行测试客户端

```bash
npm test
# 或直接运行
node test-client.js
```

### MCP 客户端配置

#### stdio 传输配置（推荐）

如果你使用 MCP 客户端（如 Claude Desktop），需要使用**绝对路径**配置：

```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["/Users/username/projects/weather-server-javascript/index.mjs"]
    }
  }
}
```

**配置步骤：**
1. 在项目目录下运行 `pwd` 获取绝对路径
2. 将上面配置中的路径替换为你的实际路径
3. 保存配置文件并重启MCP客户端

**Windows 配置示例：**
```json
{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["C:\\Users\\username\\projects\\weather-server-javascript\\index.mjs"]
    }
  }
}
```

#### HTTP/SSE 传输配置

```json
{
  "mcpServers": {
    "weather": {
      "url": "http://localhost:8080/sse"
    }
  }
}
```

**注意：** 使用HTTP传输时，需要先运行 `npm run serve` 启动服务器。

#### 快速生成配置

在项目目录下运行以下命令，快速生成MCP客户端配置：

```bash
# 生成 macOS/Linux 配置
echo '{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["'$(pwd)'/index.mjs"]
    }
  }
}'

# 或直接复制到剪贴板 (macOS)
echo '{
  "mcpServers": {
    "weather": {
      "command": "node",
      "args": ["'$(pwd)'/index.mjs"]
    }
  }
}' | pbcopy && echo "配置已复制到剪贴板！"
```

## 技术栈

- **JavaScript ES Modules** (.mjs)
- Node.js (>=18.0.0)
- MCP SDK
- Express.js (用于 HTTP/SSE 代理)
- mcp-proxy (提供 HTTP/SSE 支持)
- Zod (用于参数验证)

## 项目结构

```
weather-server-javascript/
├── index.mjs              # 主服务器文件
├── test-client.js         # 测试客户端
├── package.json          # 项目配置
└── README.md             # 项目文档
```

## 开发优势

- **无编译步骤** - 直接运行，开发更快
- **简化部署** - 不需要构建过程
- **兼容性更好** - 纯JavaScript，兼容性更广

### 调试模式

```bash
npm run serve
```

这将启动带有调试信息的服务器。

### 查看日志

服务器会输出详细的连接和请求日志，帮助你调试问题。

## 注意事项

- NWS API 仅支持美国地区的天气数据
- HTTP/SSE 模式支持多个并发连接
- 服务器会自动处理 CORS，支持跨域请求
- 需要 Node.js 18.0.0 或更高版本

## 故障排除

1. **端口被占用**: 修改 `npm run serve` 命令中的端口号
2. **连接失败**: 确保防火墙允许相应端口的连接
3. **数据获取失败**: 检查网络连接和 NWS API 可用性
4. **模块导入错误**: 确保使用 Node.js 18+ 并且 package.json 中 `"type": "module"`
5. **MCP客户端无法启动服务器**:
   - 确保使用绝对路径而不是相对路径
   - 检查路径中是否包含空格，如有空格需要用引号包围
   - 验证 Node.js 在系统 PATH 中可用：`which node` 或 `where node`
   - 测试路径是否正确：在终端中直接运行完整命令
6. **Windows 路径问题**:
   - 使用正斜杠 `/` 或双反斜杠 `\\` 
   - 避免使用单反斜杠 `\`（会被转义）