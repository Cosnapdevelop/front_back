import crypto from 'crypto';
import axios from 'axios';
import xml2js from 'xml2js';

/**
 * WeChat Pay Service for Cosnap AI
 * 微信支付服务集成
 * 
 * Supports:
 * - JSAPI (公众号支付)
 * - H5 (H5支付)
 * - Native (扫码支付)
 * - App (APP支付)
 */
class WeChatPayService {
  constructor() {
    this.appId = process.env.WECHAT_APP_ID;
    this.mchId = process.env.WECHAT_MCH_ID;
    this.apiKey = process.env.WECHAT_API_KEY;
    this.notifyUrl = process.env.WECHAT_NOTIFY_URL;
    this.certPath = process.env.WECHAT_CERT_PATH;
    this.keyPath = process.env.WECHAT_KEY_PATH;
    
    // WeChat Pay API endpoints
    this.endpoints = {
      unifiedOrder: 'https://api.mch.weixin.qq.com/pay/unifiedorder',
      orderQuery: 'https://api.mch.weixin.qq.com/pay/orderquery',
      closeOrder: 'https://api.mch.weixin.qq.com/pay/closeorder',
      refund: 'https://api.mch.weixin.qq.com/secapi/pay/refund'
    };
  }

  /**
   * 生成随机字符串
   */
  generateNonceStr(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 生成签名
   */
  generateSign(params, key = this.apiKey) {
    // 1. 参数排序
    const sortedKeys = Object.keys(params).sort();
    
    // 2. 构建签名字符串
    let signStr = '';
    for (const key of sortedKeys) {
      if (params[key] && key !== 'sign') {
        signStr += `${key}=${params[key]}&`;
      }
    }
    signStr += `key=${key}`;
    
    // 3. MD5签名并转大写
    return crypto.createHash('md5').update(signStr, 'utf8').digest('hex').toUpperCase();
  }

  /**
   * 验证签名
   */
  verifySign(params, signature, key = this.apiKey) {
    const computedSign = this.generateSign(params, key);
    return computedSign === signature;
  }

  /**
   * 对象转XML
   */
  objectToXml(obj) {
    let xml = '<xml>';
    for (const [key, value] of Object.entries(obj)) {
      xml += `<${key}><![CDATA[${value}]]></${key}>`;
    }
    xml += '</xml>';
    return xml;
  }

  /**
   * XML转对象
   */
  async xmlToObject(xml) {
    try {
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(xml);
      return result.xml;
    } catch (error) {
      throw new Error(`XML parsing failed: ${error.message}`);
    }
  }

  /**
   * 统一下单接口
   * @param {Object} orderData - 订单数据
   * @param {string} orderData.outTradeNo - 商户订单号
   * @param {string} orderData.body - 商品描述
   * @param {number} orderData.totalFee - 总金额（分）
   * @param {string} orderData.tradeType - 交易类型
   * @param {string} orderData.openid - 用户openid（JSAPI必填）
   * @param {string} orderData.spbillCreateIp - 用户IP
   */
  async createUnifiedOrder(orderData) {
    try {
      const params = {
        appid: this.appId,
        mch_id: this.mchId,
        nonce_str: this.generateNonceStr(),
        body: orderData.body,
        out_trade_no: orderData.outTradeNo,
        total_fee: orderData.totalFee,
        spbill_create_ip: orderData.spbillCreateIp,
        notify_url: this.notifyUrl,
        trade_type: orderData.tradeType,
        ...(orderData.openid && { openid: orderData.openid }),
        ...(orderData.productId && { product_id: orderData.productId })
      };

      // 生成签名
      params.sign = this.generateSign(params);

      // 转换为XML
      const xmlData = this.objectToXml(params);

      // 发送请求
      const response = await axios.post(this.endpoints.unifiedOrder, xmlData, {
        headers: { 'Content-Type': 'application/xml' },
        timeout: 30000
      });

      // 解析响应
      const result = await this.xmlToObject(response.data);

      if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
        return {
          success: true,
          data: result,
          prepayId: result.prepay_id
        };
      } else {
        throw new Error(`WeChat Pay Error: ${result.err_code_des || result.return_msg}`);
      }
    } catch (error) {
      console.error('WeChat Pay unified order error:', error);
      throw new Error(`统一下单失败: ${error.message}`);
    }
  }

  /**
   * 生成JSAPI支付参数
   */
  generateJSAPIParams(prepayId) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = this.generateNonceStr();
    
    const params = {
      appId: this.appId,
      timeStamp: timestamp,
      nonceStr: nonceStr,
      package: `prepay_id=${prepayId}`,
      signType: 'MD5'
    };

    params.paySign = this.generateSign(params);
    return params;
  }

  /**
   * 生成Native支付二维码链接
   */
  generateNativeQRCode(codeUrl) {
    // 返回二维码数据，前端可以使用库生成二维码图片
    return {
      codeUrl,
      qrCodeData: codeUrl
    };
  }

  /**
   * 查询订单状态
   */
  async queryOrder(outTradeNo, transactionId = null) {
    try {
      const params = {
        appid: this.appId,
        mch_id: this.mchId,
        nonce_str: this.generateNonceStr(),
        ...(outTradeNo && { out_trade_no: outTradeNo }),
        ...(transactionId && { transaction_id: transactionId })
      };

      params.sign = this.generateSign(params);
      const xmlData = this.objectToXml(params);

      const response = await axios.post(this.endpoints.orderQuery, xmlData, {
        headers: { 'Content-Type': 'application/xml' },
        timeout: 30000
      });

      const result = await this.xmlToObject(response.data);

      if (result.return_code === 'SUCCESS') {
        return {
          success: true,
          data: result,
          tradeState: result.trade_state,
          isPaid: result.trade_state === 'SUCCESS'
        };
      } else {
        throw new Error(`Query failed: ${result.return_msg}`);
      }
    } catch (error) {
      console.error('WeChat Pay query order error:', error);
      throw new Error(`订单查询失败: ${error.message}`);
    }
  }

  /**
   * 关闭订单
   */
  async closeOrder(outTradeNo) {
    try {
      const params = {
        appid: this.appId,
        mch_id: this.mchId,
        out_trade_no: outTradeNo,
        nonce_str: this.generateNonceStr()
      };

      params.sign = this.generateSign(params);
      const xmlData = this.objectToXml(params);

      const response = await axios.post(this.endpoints.closeOrder, xmlData, {
        headers: { 'Content-Type': 'application/xml' },
        timeout: 30000
      });

      const result = await this.xmlToObject(response.data);

      return {
        success: result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS',
        data: result
      };
    } catch (error) {
      console.error('WeChat Pay close order error:', error);
      throw new Error(`关闭订单失败: ${error.message}`);
    }
  }

  /**
   * 处理微信支付回调通知
   */
  async handleNotification(xmlData) {
    try {
      const data = await this.xmlToObject(xmlData);
      
      // 验证签名
      const { sign, ...params } = data;
      const isValidSign = this.verifySign(params, sign);
      
      if (!isValidSign) {
        throw new Error('Invalid signature');
      }

      if (data.return_code === 'SUCCESS' && data.result_code === 'SUCCESS') {
        return {
          success: true,
          data: {
            outTradeNo: data.out_trade_no,
            transactionId: data.transaction_id,
            totalFee: parseInt(data.total_fee),
            openid: data.openid,
            timeEnd: data.time_end,
            bankType: data.bank_type,
            feeType: data.fee_type
          }
        };
      } else {
        return {
          success: false,
          error: data.err_code_des || '支付失败'
        };
      }
    } catch (error) {
      console.error('WeChat Pay notification handling error:', error);
      throw new Error(`处理微信支付回调失败: ${error.message}`);
    }
  }

  /**
   * 生成成功响应XML
   */
  generateSuccessResponse() {
    return this.objectToXml({
      return_code: 'SUCCESS',
      return_msg: 'OK'
    });
  }

  /**
   * 生成失败响应XML
   */
  generateFailResponse(message = 'FAIL') {
    return this.objectToXml({
      return_code: 'FAIL',
      return_msg: message
    });
  }

  /**
   * 申请退款（需要证书）
   */
  async refund(refundData) {
    try {
      const params = {
        appid: this.appId,
        mch_id: this.mchId,
        nonce_str: this.generateNonceStr(),
        out_trade_no: refundData.outTradeNo,
        out_refund_no: refundData.outRefundNo,
        total_fee: refundData.totalFee,
        refund_fee: refundData.refundFee,
        refund_desc: refundData.refundDesc || '用户申请退款'
      };

      params.sign = this.generateSign(params);
      const xmlData = this.objectToXml(params);

      // 需要证书的请求
      const fs = await import('fs');
      const https = await import('https');
      
      const agent = new https.Agent({
        cert: fs.readFileSync(this.certPath),
        key: fs.readFileSync(this.keyPath),
        passphrase: this.mchId
      });

      const response = await axios.post(this.endpoints.refund, xmlData, {
        headers: { 'Content-Type': 'application/xml' },
        httpsAgent: agent,
        timeout: 30000
      });

      const result = await this.xmlToObject(response.data);

      if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
        return {
          success: true,
          data: result,
          refundId: result.refund_id
        };
      } else {
        throw new Error(`Refund failed: ${result.err_code_des || result.return_msg}`);
      }
    } catch (error) {
      console.error('WeChat Pay refund error:', error);
      throw new Error(`退款申请失败: ${error.message}`);
    }
  }

  /**
   * 获取用户OpenID（用于JSAPI支付）
   * 注意：这通常需要在微信公众号或小程序中获取
   */
  async getOpenId(code) {
    try {
      const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${this.appId}&secret=${process.env.WECHAT_APP_SECRET}&code=${code}&grant_type=authorization_code`;
      
      const response = await axios.get(url);
      
      if (response.data.access_token) {
        return {
          success: true,
          openid: response.data.openid,
          accessToken: response.data.access_token
        };
      } else {
        throw new Error(response.data.errmsg || '获取OpenID失败');
      }
    } catch (error) {
      console.error('Get OpenID error:', error);
      throw new Error(`获取用户OpenID失败: ${error.message}`);
    }
  }
}

export default WeChatPayService;