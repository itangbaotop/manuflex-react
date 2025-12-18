/**
 * SSE (Server-Sent Events) 请求工具函数
 */

export interface FetchSSEOptions {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: any;
  token?: string;
  onMessage: (data: string) => void;
  onError?: (error: any) => void;
  onDone?: () => void;
  signal?: AbortSignal;
}

export const fetchSSE = async ({
  url,
  method = 'POST',
  headers = {},
  body,
  token,
  onMessage,
  onError,
  onDone,
  signal,
}: FetchSSEOptions) => {
  try {
    const requestHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      ...headers,
    };

    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || errorText);
      } catch (e) {
        throw new Error(`请求失败: ${response.status} - ${errorText}`);
      }
    }

    if (!response.body) {
      throw new Error('响应体为空');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (onDone) onDone();
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      const lines = buffer.split(/\r?\n/);
      
      buffer = lines.pop() || ''; 

      for (const line of lines) {
        if (!line.trim()) continue;

        if (line.startsWith('data:')) {
          let content = line.replace(/^data:\s?/, '');
          
          // 处理 [DONE] 标记
          if (content.trim() === '[DONE]') continue;

          if (onMessage) {
             onMessage(content);
          }
        }
      }
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('用户取消生成');
    } else {
      console.error('SSE Error:', error);
      if (onError) onError(error);
    }
  }
};