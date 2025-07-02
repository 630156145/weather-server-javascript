import * as lark from '@larksuiteoapi/node-sdk';

export class FeishuService {
  client;
  
  constructor(apiId, apiSecret) {
    this.client = new lark.Client({
      appId: apiId,
      appSecret: apiSecret
    });
  }
  
  // 获取 docx 内容
  async getDocx(documentId) {
    const response = await this.client.docx.v1.document.rawContent({
      path: {
        document_id: documentId,
      },
      params: { 
        lang: 0,
      },
    });
    
    if (response.code !== 0) {
      throw new Error(`Failed to get doc from Feishu API: ${response.msg}`);
    }
    
    return response.data.content;
  }
  
  // 获取 sheets 内容
  async getSheets(spreadsheetToken) {
    try {
      // 首先获取工作表列表
      const sheetsResponse = await this.client.sheets.v1.spreadsheet.sheet.query({
        path: {
          spreadsheet_token: spreadsheetToken,
        },
      });
      
      if (sheetsResponse.code !== 0) {
        throw new Error(`Failed to get sheets list: ${sheetsResponse.msg}`);
      }
      
      const sheets = sheetsResponse.data.sheets || [];
      let content = `表格内容：\n\n`;
      
      // 获取每个工作表的内容
      for (const sheet of sheets.slice(0, 3)) { // 限制最多3个工作表
        const valuesResponse = await this.client.sheets.v1.spreadsheet.sheet.valuesBatchGet({
          path: {
            spreadsheet_token: spreadsheetToken,
          },
          params: {
            ranges: [`${sheet.sheet_id}!A1:Z100`], // 获取前100行，26列
          },
        });
        
        if (valuesResponse.code === 0 && valuesResponse.data.value_ranges) {
          content += `工作表: ${sheet.title}\n`;
          const values = valuesResponse.data.value_ranges[0]?.values || [];
          values.forEach((row, index) => {
            if (index < 10) { // 只显示前10行
              content += row.map(cell => cell?.text || '').join('\t') + '\n';
            }
          });
          content += '\n';
        }
      }
      
      return content;
    } catch (error) {
      throw new Error(`Failed to get sheets content: ${error.message}`);
    }
  }
  
  // 获取 slides 内容  
  async getSlides(presentationToken) {
    try {
      const response = await this.client.slides.v1.presentation.get({
        path: {
          presentation_token: presentationToken,
        },
      });
      
      if (response.code !== 0) {
        throw new Error(`Failed to get slides: ${response.msg}`);
      }
      
      const presentation = response.data.presentation;
      let content = `演示文稿标题: ${presentation.title}\n\n`;
      
      // 获取幻灯片列表
      const slides = presentation.slides || [];
      content += `共 ${slides.length} 张幻灯片\n\n`;
      
      // 简化处理：只返回基本信息
      slides.forEach((slide, index) => {
        content += `幻灯片 ${index + 1}: ${slide.object_id}\n`;
      });
      
      return content;
    } catch (error) {
      throw new Error(`Failed to get slides content: ${error.message}`);
    }
  }
  
  // 获取 bitable 内容
  async getBitable(appToken) {
    try {
      const response = await this.client.bitable.v1.app.get({
        path: {
          app_token: appToken,
        },
      });
      
      if (response.code !== 0) {
        throw new Error(`Failed to get bitable: ${response.msg}`);
      }
      
      const app = response.data.app;
      let content = `多维表格: ${app.name}\n描述: ${app.description || '无描述'}\n\n`;
      
      // 获取数据表列表
      const tablesResponse = await this.client.bitable.v1.app.table.list({
        path: {
          app_token: appToken,
        },
      });
      
      if (tablesResponse.code === 0) {
        const tables = tablesResponse.data.items || [];
        content += `包含 ${tables.length} 个数据表:\n`;
        tables.forEach((table, index) => {
          content += `${index + 1}. ${table.name} (${table.table_id})\n`;
        });
      }
      
      return content;
    } catch (error) {
      throw new Error(`Failed to get bitable content: ${error.message}`);
    }
  }
  
  // 获取文件信息
  async getFile(fileToken) {
    try {
      const response = await this.client.drive.v1.file.get({
        path: {
          file_token: fileToken,
        },
      });
      
      if (response.code !== 0) {
        throw new Error(`Failed to get file info: ${response.msg}`);
      }
      
      const file = response.data.file;
      return `文件名: ${file.name}\n类型: ${file.type}\n大小: ${file.size} 字节\n创建时间: ${file.created_time}\n修改时间: ${file.modified_time}`;
    } catch (error) {
      throw new Error(`Failed to get file content: ${error.message}`);
    }
  }
  
  // 获取节点信息
  async getNode(token) {
    const response = await this.client.wiki.v2.space.getNode({
      params: {
        token,
      }
    });
    
    if (response.code !== 0) {
      throw new Error(`Failed to get node from Feishu API: ${response.msg}`);
    }
    
    const { obj_type, obj_token } = response.data.node;
    
    return await this.getContentByType(obj_type, obj_token);
  }
  
  // 根据文档类型获取内容
  async getContentByType(docType, token) {
    switch (docType) {
      case 'docx':
      case 'doc':
        return await this.getDocx(token);
      case 'sheet':
      case 'sheets':
        return await this.getSheets(token);
      case 'slides':
        return await this.getSlides(token);
      case 'bitable':
        return await this.getBitable(token);
      case 'file':
        return await this.getFile(token);
      case 'mindnote':
        // 思维笔记暂时返回基本信息
        return `思维笔记文档 (ID: ${token})\n暂不支持内容提取，请直接访问飞书查看。`;
      default:
        throw new Error(`不支持的文档类型: ${docType}。支持的类型: doc, docx, sheet, sheets, slides, bitable, file, mindnote`);
    }
  }
} 