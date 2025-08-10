'use client';

import React, { useState } from 'react';
import { apiRequest } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBaseUrl } from '@/utils/envConfig';

const ApiTestPage: React.FC = () => {
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();

  const testHealthEndpoint = async () => {
    setIsLoading(true);
    setTestResult('测试中...');
    
    try {
      const response = await apiRequest('/health', {
        method: 'GET',
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestResult(`✅ 健康检查成功: ${JSON.stringify(data, null, 2)}`);
      } else {
        setTestResult(`❌ 健康检查失败: HTTP ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      setTestResult(`❌ 健康检查错误: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testSearchEndpoint = async () => {
    if (!token) {
      setTestResult('❌ 没有认证token');
      return;
    }

    setIsLoading(true);
    setTestResult('测试搜索中...');
    
    try {
      const response = await apiRequest('/api/search?q=测试', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestResult(`✅ 搜索成功: ${JSON.stringify(data, null, 2)}`);
      } else {
        const errorText = await response.text();
        setTestResult(`❌ 搜索失败: HTTP ${response.status} ${response.statusText}\n响应内容: ${errorText}`);
      }
    } catch (error: any) {
      setTestResult(`❌ 搜索错误: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testNetworkConnection = async () => {
    setIsLoading(true);
    setTestResult('测试网络连接...');
    
    const baseUrl = getApiBaseUrl();
    
    try {
      // 使用原生fetch测试连接
      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestResult(`✅ 直接连接成功: ${JSON.stringify(data, null, 2)}`);
      } else {
        setTestResult(`❌ 直接连接失败: HTTP ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      setTestResult(`❌ 网络连接错误: ${error.message}\n错误类型: ${error.name}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">API 连接测试</h1>
      
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">配置信息:</h2>
        <p><strong>后端地址:</strong> {getApiBaseUrl()}</p>
        <p><strong>认证状态:</strong> {token ? '已认证' : '未认证'}</p>
      </div>

      <div className="space-y-4">
        <button
          onClick={testNetworkConnection}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          测试网络连接
        </button>

        <button
          onClick={testHealthEndpoint}
          disabled={isLoading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          测试健康检查API
        </button>

        <button
          onClick={testSearchEndpoint}
          disabled={isLoading || !token}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          测试搜索API
        </button>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">测试结果:</h3>
        <pre className="bg-gray-100 p-4 rounded-lg text-sm whitespace-pre-wrap">
          {testResult || '点击按钮开始测试...'}
        </pre>
      </div>
    </div>
  );
};

export default ApiTestPage;