import crypto from 'crypto';
import axios from 'axios';
import NodeRSA from 'node-rsa';

/**
 * Alipay Service for Cosnap AI
 * 支付宝支付服务集成
 * 
 * Supports:
 * - Web (电脑网站支付)
 * - WAP (手机网站支付)
 * - App (APP支付)
 * - QR Code (当面付扫码)
 */
class AlipayService {
  constructor() {
    this.appId = process.env.ALIPAY_APP_ID;
    this.privateKey = process.env.ALIPAY_PRIVATE_KEY;
    this.publicKey = process.env.ALIPAY_PUBLIC_KEY;
    this.alipayPublicKey = process.env.ALIPAY_PUBLIC_KEY_OFFICIAL;
    this.notifyUrl = process.env.ALIPAY_NOTIFY_URL;
    this.returnUrl = process.env.ALIPAY_RETURN_URL;
    this.gatewayUrl = process.env.ALIPAY_GATEWAY_URL || 'https://openapi.alipay.com/gateway.do';
    this.charset = 'UTF-8';
    this.signType = 'RSA2';
    this.version = '1.0';
    this.format = 'JSON';
    
    // Initialize RSA keys
    this.rsaPrivateKey = new NodeRSA(this.privateKey, 'pkcs8-private-pem');
    this.rsaPublicKey = new NodeRSA(this.alipayPublicKey, 'pkcs8-public-pem');
  }

  /**
   * 生成签名
   */
  generateSign(params) {
    // 1. 过滤空值并排序
    const filteredParams = {};
    Object.keys(params).sort().forEach(key => {
      if (params[key] && params[key] !== '' && key !== 'sign') {
        filteredParams[key] = params[key];
      }
    });

    // 2. 构建待签名字符串
    const signStr = Object.keys(filteredParams)
      .map(key => `${key}=${filteredParams[key]}`)
      .join('&');

    // 3. RSA2签名
    return this.rsaPrivateKey.sign(signStr, 'base64');
  }

  /**
   * 验证签名
   */
  verifySign(params, signature) {
    try {
      const { sign, sign_type, ...signParams } = params;
      
      // 构建待验签字符串
      const signStr = Object.keys(signParams)
        .sort()
        .filter(key => signParams[key] && signParams[key] !== '')
        .map(key => `${key}=${signParams[key]}`)
        .join('&');

      // RSA2验签
      return this.rsaPublicKey.verify(signStr, signature, 'utf8', 'base64');
    } catch (error) {
      console.error('Alipay signature verification error:', error);
      return false;
    }
  }

  /**
   * 构建请求参数
   */
  buildRequestParams(method, bizContent) {
    const params = {
      app_id: this.appId,
      method: method,
      charset: this.charset,
      sign_type: this.signType,
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
      version: this.version,
      biz_content: JSON.stringify(bizContent),
      format: this.format
    };

    // 添加回调地址
    if (this.notifyUrl) {
      params.notify_url = this.notifyUrl;
    }
    if (this.returnUrl) {
      params.return_url = this.returnUrl;
    }

    // 生成签名
    params.sign = this.generateSign(params);
    
    return params;
  }

  /**
   * 发送API请求
   */
  async sendRequest(params) {
    try {
      const response = await axios.post(this.gatewayUrl, new URLSearchParams(params), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      console.error('Alipay API request error:', error);
      throw new Error(`支付宝API请求失败: ${error.message}`);
    }
  }

  /**
   * 统一下单 - 电脑网站支付
   */
  async createWebPayment(orderData) {
    try {
      const bizContent = {
        out_trade_no: orderData.outTradeNo,
        product_code: 'FAST_INSTANT_TRADE_PAY',
        total_amount: orderData.totalAmount.toFixed(2),
        subject: orderData.subject,
        body: orderData.body || orderData.subject,
        timeout_express: orderData.timeoutExpress || '30m'
      };

      const params = this.buildRequestParams('alipay.trade.page.pay', bizContent);
      
      // 构建支付表单
      const form = this.buildForm(params);
      
      return {
        success: true,
        paymentForm: form,
        paymentUrl: `${this.gatewayUrl}?${new URLSearchParams(params).toString()}`
      };
    } catch (error) {
      console.error('Alipay web payment creation error:', error);
      throw new Error(`创建电脑网站支付失败: ${error.message}`);
    }
  }

  /**
   * 统一下单 - 手机网站支付
   */
  async createWapPayment(orderData) {
    try {
      const bizContent = {
        out_trade_no: orderData.outTradeNo,
        product_code: 'QUICK_WAP_WAY',
        total_amount: orderData.totalAmount.toFixed(2),
        subject: orderData.subject,
        body: orderData.body || orderData.subject,
        timeout_express: orderData.timeoutExpress || '30m',
        quit_url: orderData.quitUrl || this.returnUrl
      };

      const params = this.buildRequestParams('alipay.trade.wap.pay', bizContent);
      
      return {
        success: true,
        paymentUrl: `${this.gatewayUrl}?${new URLSearchParams(params).toString()}`
      };
    } catch (error) {
      console.error('Alipay WAP payment creation error:', error);
      throw new Error(`创建手机网站支付失败: ${error.message}`);
    }
  }

  /**
   * 统一下单 - APP支付
   */
  async createAppPayment(orderData) {
    try {
      const bizContent = {
        out_trade_no: orderData.outTradeNo,
        total_amount: orderData.totalAmount.toFixed(2),
        subject: orderData.subject,
        body: orderData.body || orderData.subject,
        timeout_express: orderData.timeoutExpress || '30m',
        product_code: 'QUICK_MSECURITY_PAY'
      };

      const params = this.buildRequestParams('alipay.trade.app.pay', bizContent);
      
      // APP支付返回订单字符串
      const orderString = new URLSearchParams(params).toString();
      
      return {
        success: true,
        orderString: orderString,
        appPayData: params
      };
    } catch (error) {
      console.error('Alipay APP payment creation error:', error);
      throw new Error(`创建APP支付失败: ${error.message}`);
    }
  }

  /**
   * 当面付 - 二维码支付
   */
  async createQRPayment(orderData) {
    try {
      const bizContent = {
        out_trade_no: orderData.outTradeNo,
        total_amount: orderData.totalAmount.toFixed(2),
        subject: orderData.subject,
        body: orderData.body || orderData.subject,
        timeout_express: orderData.timeoutExpress || '5m',
        store_id: orderData.storeId || 'COSNAP_STORE_001'
      };

      const params = this.buildRequestParams('alipay.trade.precreate', bizContent);
      const result = await this.sendRequest(params);
      
      // 解析响应
      const responseKey = 'alipay_trade_precreate_response';
      if (result[responseKey] && result[responseKey].code === '10000') {
        return {
          success: true,
          data: result[responseKey],
          qrCode: result[responseKey].qr_code,
          outTradeNo: result[responseKey].out_trade_no
        };
      } else {
        throw new Error(result[responseKey]?.sub_msg || '创建扫码支付失败');
      }
    } catch (error) {
      console.error('Alipay QR payment creation error:', error);
      throw new Error(`创建扫码支付失败: ${error.message}`);
    }
  }

  /**
   * 查询订单状态
   */
  async queryOrder(outTradeNo, tradeNo = null) {
    try {
      const bizContent = {};
      if (outTradeNo) {
        bizContent.out_trade_no = outTradeNo;
      }
      if (tradeNo) {
        bizContent.trade_no = tradeNo;
      }

      const params = this.buildRequestParams('alipay.trade.query', bizContent);
      const result = await this.sendRequest(params);
      
      const responseKey = 'alipay_trade_query_response';
      if (result[responseKey] && result[responseKey].code === '10000') {
        const data = result[responseKey];
        return {
          success: true,
          data: data,
          tradeStatus: data.trade_status,
          isPaid: data.trade_status === 'TRADE_SUCCESS' || data.trade_status === 'TRADE_FINISHED'
        };
      } else {
        throw new Error(result[responseKey]?.sub_msg || '订单查询失败');
      }
    } catch (error) {
      console.error('Alipay order query error:', error);
      throw new Error(`订单查询失败: ${error.message}`);
    }
  }

  /**
   * 关闭订单
   */
  async closeOrder(outTradeNo) {
    try {
      const bizContent = {
        out_trade_no: outTradeNo
      };

      const params = this.buildRequestParams('alipay.trade.close', bizContent);
      const result = await this.sendRequest(params);
      
      const responseKey = 'alipay_trade_close_response';
      if (result[responseKey] && result[responseKey].code === '10000') {
        return {
          success: true,
          data: result[responseKey]
        };
      } else {
        throw new Error(result[responseKey]?.sub_msg || '关闭订单失败');
      }
    } catch (error) {
      console.error('Alipay close order error:', error);
      throw new Error(`关闭订单失败: ${error.message}`);
    }
  }

  /**
   * 申请退款
   */
  async refund(refundData) {
    try {
      const bizContent = {
        out_trade_no: refundData.outTradeNo,
        refund_amount: refundData.refundAmount.toFixed(2),
        refund_reason: refundData.refundReason || '用户申请退款',
        out_request_no: refundData.outRequestNo || `${refundData.outTradeNo}_${Date.now()}`
      };

      if (refundData.tradeNo) {
        bizContent.trade_no = refundData.tradeNo;
      }

      const params = this.buildRequestParams('alipay.trade.refund', bizContent);
      const result = await this.sendRequest(params);
      
      const responseKey = 'alipay_trade_refund_response';
      if (result[responseKey] && result[responseKey].code === '10000') {
        return {
          success: true,
          data: result[responseKey],
          refundFee: result[responseKey].refund_fee
        };
      } else {
        throw new Error(result[responseKey]?.sub_msg || '退款申请失败');
      }
    } catch (error) {
      console.error('Alipay refund error:', error);
      throw new Error(`退款申请失败: ${error.message}`);
    }
  }

  /**
   * 处理支付宝异步通知
   */
  async handleNotification(params) {
    try {
      const { sign, ...notifyParams } = params;
      
      // 验证签名
      const isValidSign = this.verifySign(params, sign);
      
      if (!isValidSign) {
        throw new Error('Invalid signature');
      }

      // 验证支付状态
      if (notifyParams.trade_status === 'TRADE_SUCCESS' || 
          notifyParams.trade_status === 'TRADE_FINISHED') {
        return {
          success: true,
          data: {
            outTradeNo: notifyParams.out_trade_no,
            tradeNo: notifyParams.trade_no,
            totalAmount: parseFloat(notifyParams.total_amount),
            buyerLogonId: notifyParams.buyer_logon_id,
            buyerId: notifyParams.buyer_id,
            sellerId: notifyParams.seller_id,
            tradeStatus: notifyParams.trade_status,
            gmtPayment: notifyParams.gmt_payment,
            appId: notifyParams.app_id
          }
        };
      } else {
        return {
          success: false,
          error: `支付状态异常: ${notifyParams.trade_status}`
        };
      }
    } catch (error) {
      console.error('Alipay notification handling error:', error);
      throw new Error(`处理支付宝回调失败: ${error.message}`);
    }
  }

  /**
   * 构建支付表单（用于网页支付）
   */
  buildForm(params) {
    let form = `<form id="alipayForm" action="${this.gatewayUrl}" method="POST">`;
    
    for (const [key, value] of Object.entries(params)) {
      form += `<input type="hidden" name="${key}" value="${value}">`;
    }
    
    form += '<input type="submit" value="立即支付" style="display:none;">';
    form += '</form>';
    form += '<script>document.getElementById("alipayForm").submit();</script>';
    
    return form;
  }

  /**
   * 验证同步返回结果
   */
  validateReturnUrl(params) {
    try {
      const { sign, ...returnParams } = params;
      return this.verifySign(params, sign);
    } catch (error) {
      console.error('Alipay return URL validation error:', error);
      return false;
    }
  }

  /**
   * 生成成功响应
   */
  generateSuccessResponse() {
    return 'success';
  }

  /**
   * 生成失败响应
   */
  generateFailResponse() {
    return 'fail';
  }

  /**
   * 获取支付宝账单下载地址
   */
  async getBillDownloadUrl(billDate, billType = 'trade') {
    try {
      const bizContent = {
        bill_type: billType,
        bill_date: billDate
      };

      const params = this.buildRequestParams('alipay.data.dataservice.bill.downloadurl.query', bizContent);
      const result = await this.sendRequest(params);
      
      const responseKey = 'alipay_data_dataservice_bill_downloadurl_query_response';
      if (result[responseKey] && result[responseKey].code === '10000') {
        return {
          success: true,
          downloadUrl: result[responseKey].bill_download_url
        };
      } else {
        throw new Error(result[responseKey]?.sub_msg || '获取账单下载地址失败');
      }
    } catch (error) {
      console.error('Alipay bill download URL error:', error);
      throw new Error(`获取账单下载地址失败: ${error.message}`);
    }
  }
}

export default AlipayService;