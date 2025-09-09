class WechatPush {
  constructor() {
    this.appId = process.env.APP_ID;
    this.appSecret = process.env.APP_SECRET;
    this.accessToken = null;
  }

  async getAccessToken() {
    const apiUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`;
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('获取access_token失败');
      const data = await response.json();
      this.accessToken = data.access_token;
      return this.accessToken;
    } catch (error) {
      console.log('获取access_token失败', error);
      throw error;
    }
  }

  // 客服消息推送（48小时内有互动的用户）
  async sendMessage(message, openid) {
    if (!this.accessToken) await this.getAccessToken();
    const apiUrl = `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${this.accessToken}`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        touser: openid,
        msgtype: 'text',
        text: {
          content: message,
        },
      }),
    });
    return response.json();
  }

  // 模板消息推送（推荐使用）
  async sendTemplateMessage(openid, templateId, data, url = '') {
    if (!this.accessToken) await this.getAccessToken();
    const apiUrl = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${this.accessToken}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        touser: openid,
        template_id: templateId,
        url: url,
        data: data,
      }),
    });
    return response.json();
  }

  // 订阅消息推送
  async sendSubscribeMessage(openid, templateId, data, page = '') {
    if (!this.accessToken) await this.getAccessToken();
    const apiUrl = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${this.accessToken}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        touser: openid,
        template_id: templateId,
        page: page,
        data: data,
      }),
    });
    return response.json();
  }

  // 批量推送
  async batchSendTemplate(openids, templateId, dataFactory, urlFactory = null) {
    const results = [];
    for (const openid of openids) {
      try {
        const data =
          typeof dataFactory === 'function' ? dataFactory(openid) : dataFactory;
        const url =
          typeof urlFactory === 'function'
            ? urlFactory(openid)
            : urlFactory || '';
        const result = await this.sendTemplateMessage(
          openid,
          templateId,
          data,
          url
        );
        results.push({ openid, success: true, result });
      } catch (error) {
        results.push({ openid, success: false, error: error.message });
      }
    }
    return results;
  }
}

// 获取天气信息 - 使用 WeatherAPI
async function getWeather(city = '上海') {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    return '天气信息获取失败';
  }

  try {
    // 使用 WeatherAPI.com - 免费1百万次/月
    const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(city)}&lang=zh`;
    const response = await fetch(url);
    const data = await response.json();

    if (response.ok && data.current) {
      const temp = Math.round(data.current.temp_c);
      const desc = data.current.condition.text;
      const feels_like = Math.round(data.current.feelslike_c);
      return `${temp}°C ${desc} (体感${feels_like}°C)`;
    } else {
      return '天气信息获取失败';
    }
  } catch (error) {
    console.error('获取天气信息失败:', error);
    return '天气信息获取失败';
  }
}

function toDay() {
  const now = new Date();

  // 转换为北京时间
  const beijingTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' })
  );

  const year = beijingTime.getFullYear();
  const month = String(beijingTime.getMonth() + 1).padStart(2, '0');
  const day = String(beijingTime.getDate()).padStart(2, '0');
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const week = weekDays[beijingTime.getDay()];

  return `${year}-${month}-${day} 星期${week}`;
}

async function main() {
  const wechatPush = new WechatPush();

  // 你的个人openid（需要先关注公众号获取）
  const myOpenid = process.env.MY_OPENID || 'om7wX2FC-BJCZ08G4YtRNZ0HV_5E';

  try {
    // 方式1: 发送简单文本消息（需要48小时内有互动）
    // const result = await wechatPush.sendMessage('Hello from GitHub Actions!', myOpenid);

    // 获取天气信息
    console.log('开始获取天气信息...');
    const weather = await getWeather('上海');
    console.log('获取到的天气信息:', weather);

    // 方式2: 发送模板消息（推荐）
    const templateId = process.env.TEMPLATE_ID;
    const templateData = {
      first: {
        value: toDay(),
      },
      keyword1: {
        value: '上海徐汇',
      },
      keyword2: {
        value: new Date().toLocaleString('zh-CN', {
          timeZone: 'Asia/Shanghai',
        }),
      },
      remark: {
        value: `今日天气：${weather}`,
      },
    };

    const result = await wechatPush.sendTemplateMessage(
      myOpenid,
      templateId,
      templateData,
      'https://blog.yinxk.online'
    );

    console.log('推送结果:', result);
  } catch (error) {
    console.error('推送失败:', error);
  }
}

if (require.main === module) {
  main();
}
