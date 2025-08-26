// 调试日志工具 - 生产环境静默
export class DebugLogger {
  private static logs: string[] = [];
  
  static log(message: string, data?: any) {
    // 完全禁用控制台输出
    return;
    
    const timestamp = new Date().toISOString();
    const logEntry = `[DEBUG ${timestamp}] ${message}`;
    
    this.logs.push(`${logEntry} ${data ? JSON.stringify(data) : ''}`);
    
    // 限制日志数量，避免内存泄漏
    if (this.logs.length > 100) {
      this.logs.shift();
    }
  }
  
  static getAllLogs(): string[] {
    return [...this.logs];
  }
  
  static clearLogs() {
    this.logs = [];
  }
  
  static exportLogs(): string {
    return this.logs.join('\n');
  }
}