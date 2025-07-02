import { config } from "dotenv";

// 加载环境变量
config();

export function getFeishuConfig() {
  const feishuAppId = process.env.FEISHU_APP_ID;
  const feishuAppSecret = process.env.FEISHU_APP_SECRET;
  
  if (!feishuAppId || !feishuAppSecret) {
    console.warn("飞书配置未找到：FEISHU_APP_ID 和 FEISHU_APP_SECRET 环境变量未设置");
    console.warn("飞书相关功能将不可用");
    return null;
  }
  
  return {
    feishuAppId,
    feishuAppSecret
  };
}

// 屏蔽敏感信息的辅助函数
export function maskApiKey(key) {
  if (!key) return "未设置";
  if (key.length <= 8) return "*".repeat(key.length);
  return key.substring(0, 4) + "*".repeat(key.length - 8) + key.substring(key.length - 4);
} 