#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import express from "express";
import cors from "cors";
import { FeishuService } from "./services/feishu.mjs";
import { getFeishuConfig, maskApiKey } from "./config/index.mjs";

const NWS_API_BASE = "https://api.weather.gov";
const USER_AGENT = "weather-app/1.0";

// 初始化飞书服务
let feishuService = null;
const feishuConfig = getFeishuConfig();
if (feishuConfig) {
  feishuService = new FeishuService(feishuConfig.feishuAppId, feishuConfig.feishuAppSecret);
  console.log(`飞书服务已初始化，App ID: ${maskApiKey(feishuConfig.feishuAppId)}`);
} else {
  console.log("飞书服务未初始化：缺少配置信息");
}

// Helper function for making NWS API requests
async function makeNWSRequest(url) {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/geo+json",
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.log("Error making NWS request:", error);
    return null;
  }
}

// Format alert data
function formatAlert(feature) {
  const props = feature.properties;
  return [
    `Event: ${props.event || "Unknown"}`,
    `Area: ${props.areaDesc || "Unknown"}`,
    `Severity: ${props.severity || "Unknown"}`,
    `Status: ${props.status || "Unknown"}`,
    `Headline: ${props.headline || "No headline"}`,
    "---",
  ].join("\n");
}

// Create server instance
const server = new McpServer({
  name: "weather-feishu",
  version: "1.0.0",
});

// Register weather tools
server.tool(
  "get-alerts",
  "Get weather alerts for a state",
  {
    state: z.string().length(2).describe("Two-letter state code (e.g. CA, NY)"),
  },
  async ({ state }) => {
    const stateCode = state.toUpperCase();
    const alertsUrl = `${NWS_API_BASE}/alerts?area=${stateCode}`;
    const alertsData = await makeNWSRequest(alertsUrl);

    if (!alertsData) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve alerts data",
          },
        ],
      };
    }

    const features = alertsData.features || [];
    if (features.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No active alerts for ${stateCode}`,
          },
        ],
      };
    }

    const formattedAlerts = features.map(formatAlert);
    const alertsText = `Active alerts for ${stateCode}:\n\n${formattedAlerts.join("\n")}`;

    return {
      content: [
        {
          type: "text",
          text: alertsText,
        },
      ],
    };
  },
);

server.tool(
  "get-forecast",
  "Get weather forecast for a location",
  {
    latitude: z.number().min(-90).max(90).describe("Latitude of the location"),
    longitude: z
      .number()
      .min(-180)
      .max(180)
      .describe("Longitude of the location"),
  },
  async ({ latitude, longitude }) => {
    // Get grid point data
    const pointsUrl = `${NWS_API_BASE}/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const pointsData = await makeNWSRequest(pointsUrl);

    if (!pointsData) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to retrieve grid point data for coordinates: ${latitude}, ${longitude}. This location may not be supported by the NWS API (only US locations are supported).`,
          },
        ],
      };
    }

    const forecastUrl = pointsData.properties?.forecast;
    if (!forecastUrl) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to get forecast URL from grid point data",
          },
        ],
      };
    }

    // Get forecast data
    const forecastData = await makeNWSRequest(forecastUrl);
    if (!forecastData) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve forecast data",
          },
        ],
      };
    }

    const periods = forecastData.properties?.periods || [];
    if (periods.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No forecast periods available",
          },
        ],
      };
    }

    // Format forecast periods
    const formattedForecast = periods.map((period) =>
      [
        `${period.name || "Unknown"}:`,
        `Temperature: ${period.temperature || "Unknown"}°${period.temperatureUnit || "F"}`,
        `Wind: ${period.windSpeed || "Unknown"} ${period.windDirection || ""}`,
        `${period.shortForecast || "No forecast available"}`,
        "---",
      ].join("\n"),
    );

    const forecastText = `Forecast for ${latitude}, ${longitude}:\n\n${formattedForecast.join("\n")}`;

    return {
      content: [
        {
          type: "text",
          text: forecastText,
        },
      ],
    };
  },
);

// Register Feishu tool
server.tool(
  "get-feishu-doc",
  "获取飞书文档内容（纯文本）",
  {
    docId: z
      .string()
      .describe(
        "飞书文档ID，通常在URL中找到。支持以下类型的完整链接或文档ID：doc、docx、sheet、sheets、mindnote、bitable、file、slides、wiki"
      ),
  },
  async ({ docId }) => {
    if (!feishuService) {
      return {
        content: [
          {
            type: "text",
            text: "飞书服务未配置：请设置 FEISHU_APP_ID 和 FEISHU_APP_SECRET 环境变量",
          },
        ],
      };
    }

    try {
      // 如果传入的是完整URL，提取docId
      let extractedDocId = docId;
      let docType = "unknown";
      
      if (docId.includes("feishu.cn") || docId.includes("larksuite.com")) {
        // 支持多种文档类型的URL格式
        const urlMatch = docId.match(/(?:feishu\.cn|larksuite\.com)\/(doc|docx|sheet|sheets|mindnote|bitable|file|slides|wiki)\/([^/?#]+)/);
        if (urlMatch) {
          docType = urlMatch[1];
          extractedDocId = urlMatch[2];
          console.log(`识别文档类型：${docType}，文档ID：${extractedDocId}`);
        } else {
          // 尝试匹配其他可能的URL格式
          const alternativeMatch = docId.match(/(?:feishu\.cn|larksuite\.com)\/[^/]*\/([^/?#]+)/);
          if (alternativeMatch) {
            extractedDocId = alternativeMatch[1];
            console.log(`使用备选匹配提取文档ID：${extractedDocId}`);
          }
        }
      }

      console.log(`正在获取飞书文档：${extractedDocId}`);
      
      let content;
      // 根据识别的文档类型选择处理方式
      if (docType !== "unknown" && docType !== "wiki") {
        // 直接根据文档类型获取内容
        content = await feishuService.getContentByType(docType, extractedDocId);
      } else {
        // 使用wiki API获取节点信息（适用于wiki类型或未识别类型）
        content = await feishuService.getNode(extractedDocId);
      }
      
      return {
        content: [
          {
            type: "text",
            text: content,
          },
        ],
      };
    } catch (error) {
      console.log(`获取飞书文档失败：${error.message}, ${error.response.status}, ${error.response.statusText}, ${JSON.stringify(error.response.data)}`);
      return {
        content: [
          {
            type: "text",
            text: `获取飞书文档失败：${error.message}, ${error.response.status}, ${error.response.statusText}, ${JSON.stringify(error.response.data)}`,
          },
        ],
      };
    }
  },
);

// Start the server
async function main() {
  const args = process.argv.slice(2);
  const transportType = args[0] || "stdio";
  const port = parseInt(args[1]) || 8080;

  if (transportType === "sse") {
    // Create Express app for SSE transport
    const app = express();
    
    // Enable CORS for all origins
    app.use(cors({
      origin: "*",
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"]
    }));

    // Handle JSON parsing
    app.use(express.json());

    // Serve static files or basic info
    app.get("/", (req, res) => {
      res.json({
        name: "Weather and Feishu MCP Server",
        version: "1.0.0",
        description: "MCP Server for weather data and Feishu document access",
        endpoints: {
          sse: "/sse"
        },
        tools: [
          "get-alerts: 获取天气预警",
          "get-forecast: 获取天气预报", 
          feishuService ? "get-feishu-doc: 获取飞书文档内容" : "get-feishu-doc: 未配置（需要设置飞书API密钥）"
        ]
      });
    });

    // SSE endpoint 
    app.get("/sse", async (req, res) => {
      console.log("New SSE connection established");
      
      const transport = new SSEServerTransport("/messages", res);
      await server.connect(transport);
    });

    // Messages endpoint
    app.post("/messages", async (req, res) => {
      // This will be handled by the transport connected in /sse
      res.status(200).json({ status: "ok" });
    });

    // Start HTTP server
    app.listen(port, () => {
      console.log(`Weather and Feishu MCP Server running on http://localhost:${port}`);
      console.log(`SSE endpoint: http://localhost:${port}/sse`);
    });
  } else {
    // Default to stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("Weather and Feishu MCP Server running on stdio");
  }
}

main().catch((error) => {
  console.log("Fatal error in main():", error);
  process.exit(1);
}); 