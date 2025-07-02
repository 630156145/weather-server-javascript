# Weather and Feishu MCP Server

A comprehensive Model Context Protocol (MCP) server that provides both weather data and Feishu document access to AI agents like Claude and cursor.

## Features

### Weather Tools
- **get-alerts**: Get weather alerts for a US state
- **get-forecast**: Get weather forecast for specific coordinates

### Feishu (Lark) Tools  
- **get-feishu-doc**: 获取飞书文档内容（纯文本格式）

## Installation

```bash
npm install
```

## Configuration

### Weather功能
Weather功能无需配置，直接使用美国国家气象局(NWS)的公开API。

### 飞书功能配置

1. **创建飞书自建应用**
   - 访问 [飞书开放平台](https://open.feishu.cn/)
   - 创建自建应用并获取App ID和App Secret
   - [详细文档](https://open.feishu.cn/document/server-docs/api-call-guide/terminology)

2. **应用权限配置**
   - 为应用添加文档读取权限
   - [权限配置文档](https://open.feishu.cn/document/uAjLw4CM/ugTN1YjL4UTN24CO1UjN/trouble-shooting/how-to-add-permissions-to-app)

3. **环境变量设置**
   ```bash
   # 复制环境变量模板
   cp .env.example .env
   
   # 编辑.env文件，填入你的飞书应用信息
   FEISHU_APP_ID=your_feishu_app_id_here
   FEISHU_APP_SECRET=your_feishu_app_secret_here
   ```

## Usage

### 作为MCP服务运行 (推荐)

#### Stdio 模式 (用于Claude Desktop等)
```bash
npm start
# 或者
node index.mjs stdio
```

#### HTTP/SSE 模式 (用于网页应用)
```bash
node index.mjs sse [port]
# 默认端口8080，或自定义端口
node index.mjs sse 3001
```

### 工具使用示例

#### 天气功能
- `get-alerts` - 参数: `state` (两字母州代码，如 "CA", "NY")
- `get-forecast` - 参数: `latitude`, `longitude` (纬度经度)

#### 飞书文档功能  
- `get-feishu-doc` - 参数: `docId` (文档ID或完整URL)
  - 支持多种文档类型：
    - **doc/docx**: 文档 - `https://feishu.cn/docx/xxxxx`
    - **sheet/sheets**: 表格 - `https://feishu.cn/sheets/xxxxx`
    - **slides**: 演示文稿 - `https://feishu.cn/slides/xxxxx`
    - **bitable**: 多维表格 - `https://feishu.cn/bitable/xxxxx`
    - **wiki**: 知识库 - `https://feishu.cn/wiki/xxxxx`
    - **file**: 云文档文件 - `https://feishu.cn/file/xxxxx`
    - **mindnote**: 思维笔记 - `https://feishu.cn/mindnote/xxxxx` (基本信息)

## 在Cursor中使用

1. **配置MCP客户端**
   将此服务添加到你的MCP客户端配置中

2. **使用天气功能**
   ```
   请帮我查询加州的天气预警
   请获取纬度37.7749，经度-122.4194的天气预报
   ```

3. **使用飞书文档功能**
   ```
   请帮我读取这个飞书文档：https://feishu.cn/docx/doccnxxx...
   请帮我读取这个飞书表格：https://feishu.cn/sheets/shtcnxxx...
   请分析这个演示文稿：https://feishu.cn/slides/phtcnxxx...
   请查看这个多维表格：https://feishu.cn/bitable/bblcnxxx...
   ```

## 项目结构

```
weather-server-javascript/
├── index.mjs              # 主服务文件
├── services/
│   └── feishu.mjs        # 飞书服务模块
├── config/
│   └── index.mjs         # 配置管理
├── .env.example          # 环境变量模板
├── package.json          # 依赖管理
└── README.md             # 说明文档
```

## 故障排除

### 飞书功能不可用
- 检查是否设置了 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET` 环境变量
- 确认飞书应用具有对应文档类型的读取权限：
  - 文档权限：读取与编辑文档
  - 表格权限：读取与编辑电子表格
  - 演示文稿权限：读取与编辑演示文稿
  - 多维表格权限：读取与编辑多维表格
  - 云文档权限：读取与编辑云空间文件
- 检查文档ID或URL格式是否正确，支持的格式：
  - `https://feishu.cn/{type}/{id}` (type: doc, docx, sheet, sheets, slides, bitable, wiki, file, mindnote)
  - 直接提供文档ID

### 天气功能限制
- 仅支持美国地区的天气数据（NWS API限制）
- 坐标必须在美国境内

## 技术特性

- **双协议支持**: Stdio和HTTP/SSE传输模式
- **错误处理**: 完善的错误提示和降级处理
- **环境适配**: 开发和生产环境配置分离
- **类型安全**: 使用Zod进行参数验证

## License

ISC License

## 更新日志

- **v1.0.0**: 集成飞书文档读取功能，保持原有天气功能
  - 新增飞书文档内容获取
  - 支持文档URL自动解析
  - 优化配置管理系统
