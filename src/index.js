const gemini_api_key = 'AIzaSyBc8S1whLGE_xxx-xxxxxx' // 请替换为你的Gemini API密钥
const user = {
  username: 'admin',
  password: '123456'
}
const systemlrole = `
# 角色
你是一个专业的SEO优化顾问，擅长分析HTML页面并提供详细的SEO优化建议，帮助用户提升页面在搜索引擎中的排名。

## 技能
### 技能1：分析HTML页面
- 当用户输入一个HTML页面时，首先解析页面的结构、内容和元数据。
- 识别页面中可能影响SEO的元素，如标题、描述、关键词、图片alt属性等。
- 分析页面中的关键词和元数据，搜寻同类型优秀关键词和元数据，与当前的做对比，确保它们符合搜索引擎的最佳实践。

### 技能2：提供优化建议
- 根据页面上的内容，给一些高质量的关键词推荐。
- 根据分析结果，提供具体的SEO优化建议。
- 专注于高级的SEO优化建议，不要给出低级的常规优化建议。
- 确保所有建议都符合当前搜索引擎的最佳实践，并且易于用户理解和实施。示例回复：
=====
🔧 优化建议: <具体的SEO优化建议>
=====
## 限制
- 只讨论与SEO优化相关的内容，拒绝回答其他无关话题。
- 输出内容必须按照给定格式组织，不得偏离框架要求。
- 每个建议应简明扼要，便于用户理解和实施。
- 只需要给出优化建议，不要给出其他内容。
- 始终使用中文回复`;
function textreplace (html) {

  let result = html;

  // Remove JavaScript and CSS
  result = result.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  result = result.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
  result = result.replace(/<link\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>/gi, "");

  // Remove inline styles and classes
  result = result.replace(/\s+class=(["'])(.*?)\1/gi, "");
  result = result.replace(/\s+style=(["'])(.*?)\1/gi, "");

  // Minimize whitespace
  result = result.replace(/\s+/g, " ");
  result = result.replace(/>\s+</g, "><");
  result = result.replace(/&nbsp;/g, '')
  result = result.trim();
  const regex = /(?:<img[^>]*src="|href=")([^"]*)/gi;
  result = result.replace(regex, (match, url) => {
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1];
    return match.replace(url, lastPart);
  });

  return result;
}

export default {
  async fetch (request, env) {

    const url = new URL(request.url);
    //判断是否登录了，没登陆返回登录页面
    // 如果是登录请求
    if (url.pathname === '/login' && request.method === 'POST') {
      const formData = await request.formData();
      const username = formData.get('username');
      const password = formData.get('password');
      
      // 验证用户名和密码
      if (username === (env.ADMIN_USER || user.username)&& password === (env.ADMIN_PASS || user.password)) {
        // 生成简单的token
        const token = btoa(`${username}:${Date.now()}`);
        return new Response(JSON.stringify({ token }), {
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': `token=${token}; HttpOnly; Path=/; SameSite=Strict`
          }
        });
      } else {
        return new Response(JSON.stringify({ error: '用户名或密码错误' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    if (url.pathname === '/login' && request.method === 'GET'){
      // 清除登录cookie
      return new Response('', {
        status: 302,  
        headers: {
          'Location': '/',
          'Set-Cookie': 'token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict'
        }
      });
    }

    // 检查是否已登录
    const token = request.headers.get('Cookie')?.match(/token=([^;]+)/)?.[1];
    if (!token) {
      // 返回登录页面
      const loginHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>登录</title>
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #f5f5f5;
              font-family: Arial, sans-serif;
            }
            .login-form {
              background: white;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            input {
              display: block;
              margin: 10px 0;
              padding: 8px;
              width: 200px;
              border: 1px solid #ddd;
              border-radius: 4px;
            }
            button {
              width: 100%;
              padding: 10px;
              background: #007bff;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
            }
            button:hover {
              background: #0056b3;
            }
          </style>
        </head>
        <body>
          <div class="login-form">
            <h2>登录</h2>
            <form id="loginForm">
              <input type="text" name="username" placeholder="用户名" required>
              <input type="password" name="password" placeholder="密码" required>
              <button type="submit">登录</button>
            </form>
          </div>
          <script>
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              try {
                const response = await fetch('/login', {
                  method: 'POST',
                  body: formData
                });
                const data = await response.json();
                if (data.token) {
                  localStorage.setItem('token', data.token);
                  window.location.href = '/';
                } else {
                  alert('登录失败：' + (data.error || '未知错误'));
                }
              } catch (error) {
                alert('登录失败：' + error.message);
              }
            });
          </script>
        </body>
        </html>
      `;
      return new Response(loginHtml, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
      });
    }

    // 验证token的有效性
    try {
      const [username, timestamp] = atob(token).split(':');
      const tokenAge = Date.now() - parseInt(timestamp);
      if (tokenAge > 24 * 60 * 60 * 1000) { // token有效期24小时
        throw new Error('Token已过期');
      }
    } catch (error) {
      return new Response('登录已过期，请重新登录', {
        status: 401,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
      });
    }

    // 如果是首页请求，返回带输入框的首页
    if (url.pathname === '/') {
      const homeHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>SEO分析工具</title>
          <style>
            body {
              max-width: 800px;
              margin: 40px auto;
              padding: 0 20px;
              font-family: Arial, sans-serif;
            }
            .url-form {
              background: white;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 0 10px rgba(0,0,0,0.1);
            }
            .url-input {
              width: 100%;
              padding: 10px;
              margin: 10px 0;
              border: 1px solid #ddd;
              border-radius: 4px;
              box-sizing: border-box;
            }
            .submit-btn {
              width: 100%;
              padding: 10px;
              background: #007bff;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
            }
            .submit-btn:hover {
              background: #0056b3;
            }
            .result {
              margin-top: 20px;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 8px;
              white-space: pre-wrap;
            }
            .logout-btn {
              position: absolute;
              top: 20px;
              right: 20px;
              padding: 8px 16px;
              background: #dc3545;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
            }
            .logout-btn:hover {
              background: #c82333;
            }
          </style>
        </head>
        <body>
          <button class="logout-btn" onclick="logout()">退出登录</button>
          <div class="url-form">
            <h2>SEO分析工具</h2>
            <form id="urlForm">
              <input type="url" class="url-input" name="url" placeholder="请输入要分析的网址" required>
              <button type="submit" class="submit-btn">开始分析</button>
            </form>
          </div>
          <div id="result" class="result" style="display: none;"></div>

          <script>
            function logout() {
              localStorage.removeItem('token');
              document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
              window.location.href = '/login';
            }

            document.getElementById('urlForm').addEventListener('submit', async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const url = formData.get('url');
              const resultDiv = document.getElementById('result');
              
              try {
                resultDiv.style.display = 'block';
                resultDiv.textContent = '分析中...';
                
                const response = await fetch('/url', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                  },
                  body: JSON.stringify({url: url})
                });
                
                if (!response.ok) {
                  throw new Error('请求失败：' + response.statusText);
                }
                
                const result = await response.text();
                resultDiv.textContent = result;
              } catch (error) {
                resultDiv.textContent = '错误：' + error.message;
              }
            });
          </script>
        </body>
        </html>
      `;
      return new Response(homeHtml, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
      });
    }
    

    //判断请求的是 / 返回一个html页面
    if (url.pathname === '/url') {
      // 获取POST请求体
      const { url: targetUrl } = await request.json();
      if (!targetUrl) {
        return new Response('请提供需要分析的URL', { 
          status: 400,
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
        });
      }

      try {
        console.log(targetUrl)
        const response = await fetch(targetUrl);
        if (!response.ok) {
          return new Response(`Failed to fetch URL: ${response.statusText}`, { status: response.status });
        }
        console.log('抓取到数据量')
        let html2 = await response.text();
        html2 = textreplace(html2)

        // 调用 Gemini API 进行 SEO 分析
        const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + (env.GEMINI_API_KEY || gemini_api_key), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${env.GEMINI_API_KEY || gemini_api_key}`
          },
          body: JSON.stringify({
            contents: [
              {
                "role": "user",
                "parts": [{
                  "text": `${systemlrole}`
                }, {
                    text: `请作为SEO专家分析以下HTML内容,并提供具体的优化建议:
                
                ${html2}`
                  }
                ]
              }]
          })
        });

        if (!geminiResponse.ok) {
          throw new Error('Gemini API 调用失败: ' + geminiResponse.statusText);
        }

        const geminiResult = await geminiResponse.json();
        const seoAnalysis = geminiResult.candidates[0].content.parts[0].text;
        return new Response(seoAnalysis);
        // let response2 = await env.AI.run('@cf/meta/llama-3-8b-instruct', input);
        // messages - chat style input
        let chat = {
          messages: [
            { role: 'system', content: systemlrole },
            { role: 'user', content: `${html2}` }
          ],
          // prompt: `请对以下文本进行SEO优化，并提供5个关键词: ${html}` 
        };
        let response2 = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', chat);
        return new Response(response2.response);
      } catch (error) {
        console.log(error)
        return new Response(`Error: ${error.message}`, { status: 500 });
      }
  }
  return new Response('404', { status: 404 });
    // prompt - simple completion style input


  }
};