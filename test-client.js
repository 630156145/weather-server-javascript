#!/usr/bin/env node

/**
 * 简单的MCP客户端测试脚本
 * 演示如何通过HTTP与MCP服务器交互
 */

const http = require('http');

const MCP_SERVER_URL = 'localhost';
const MCP_SERVER_PORT = 8080;

// 发送HTTP POST请求的辅助函数
function sendRequest(path, data, sessionId = null) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);
        
        const options = {
            hostname: MCP_SERVER_URL,
            port: MCP_SERVER_PORT,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
            }
        };

        // 如果有sessionId，添加到头部
        if (sessionId) {
            options.headers['mcp-session-id'] = sessionId;
        }

        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const jsonResponse = JSON.parse(responseData);
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: jsonResponse
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: responseData
                    });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.write(postData);
        req.end();
    });
}

// 初始化连接
async function initializeConnection() {
    console.log('🚀 初始化MCP连接...');
    
    const initRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: {
                name: "test-weather-client",
                version: "1.0.0"
            }
        }
    };

    try {
        const response = await sendRequest('/mcp', initRequest);
        console.log('✅ 初始化响应:', JSON.stringify(response.data, null, 2));
        
        // 提取sessionId（如果有的话）
        const sessionId = response.headers['mcp-session-id'];
        return sessionId;
    } catch (error) {
        console.error('❌ 初始化失败:', error.message);
        throw error;
    }
}

// 发送initialized通知
async function sendInitialized(sessionId) {
    console.log('📨 发送initialized通知...');
    
    const notifyRequest = {
        jsonrpc: "2.0",
        method: "notifications/initialized"
    };

    try {
        await sendRequest('/mcp', notifyRequest, sessionId);
        console.log('✅ Initialized通知已发送');
    } catch (error) {
        console.error('❌ 发送通知失败:', error.message);
    }
}

// 获取可用工具列表
async function listTools(sessionId) {
    console.log('🔧 获取工具列表...');
    
    const toolsRequest = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list"
    };

    try {
        const response = await sendRequest('/mcp', toolsRequest, sessionId);
        console.log('✅ 可用工具:', JSON.stringify(response.data, null, 2));
        return response.data.result?.tools || [];
    } catch (error) {
        console.error('❌ 获取工具失败:', error.message);
        return [];
    }
}

// 调用get-alerts工具
async function getWeatherAlerts(sessionId, state = "CA") {
    console.log(`🌦️  获取${state}州的天气警报...`);
    
    const alertsRequest = {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
            name: "get-alerts",
            arguments: {
                state: state
            }
        }
    };

    try {
        const response = await sendRequest('/mcp', alertsRequest, sessionId);
        console.log('✅ 天气警报结果:', JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.error('❌ 获取天气警报失败:', error.message);
        return null;
    }
}

// 调用get-forecast工具
async function getWeatherForecast(sessionId, lat = 37.7749, lon = -122.4194) {
    console.log(`🌡️  获取坐标(${lat}, ${lon})的天气预报...`);
    
    const forecastRequest = {
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
            name: "get-forecast",
            arguments: {
                latitude: lat,
                longitude: lon
            }
        }
    };

    try {
        const response = await sendRequest('/mcp', forecastRequest, sessionId);
        console.log('✅ 天气预报结果:', JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        console.error('❌ 获取天气预报失败:', error.message);
        return null;
    }
}

// 主测试函数
async function main() {
    console.log('🌟 开始MCP天气服务器测试');
    console.log('🔗 服务器地址: http://' + MCP_SERVER_URL + ':' + MCP_SERVER_PORT);
    console.log('');

    try {
        // 1. 初始化连接
        const sessionId = await initializeConnection();
        console.log('🆔 Session ID:', sessionId || '无');
        console.log('');

        // 2. 发送initialized通知
        await sendInitialized(sessionId);
        console.log('');

        // 3. 获取工具列表
        const tools = await listTools(sessionId);
        console.log('');

        // 4. 测试工具调用
        if (tools.length > 0) {
            // 测试获取加州天气警报
            await getWeatherAlerts(sessionId, "CA");
            console.log('');

            // 测试获取旧金山天气预报
            await getWeatherForecast(sessionId, 37.7749, -122.4194);
        } else {
            console.log('⚠️  没有找到可用的工具');
        }

        console.log('');
        console.log('🎉 测试完成！');

    } catch (error) {
        console.error('💥 测试失败:', error.message);
        process.exit(1);
    }
}

// 运行测试
if (require.main === module) {
    main().catch(console.error);
} 