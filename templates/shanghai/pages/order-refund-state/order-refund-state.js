import Config from '../../utils/config';
import Utils from '../../utils/utils';

const App = getApp();

Page({
  data: {
    shipCarrierIndex: 0,
    waybillNumber: '',
    refundProgressTip: ''
  },
  onLoad(options) {
    Utils.showLoadingToast('加载中...');
    this.initPage(options.id);
    App.gaScreenView('售后进度');
  },

  // initPage
  initPage(id) {
    let that = this;

    App.request({
      url: Config.API.REFUND_QUERY,
      data: {
        orderItemId: id
      }
    }).then(res => {
      let SHIP_CARRIERS = Config.SHIP_CARRIERS.map(item => item.str);
      let refundItem = res.data;
      let refundTypeOperator = refundItem.refund_type === 'refund_only' ? 'refund' : 'return';
      let refundProgressTip = this.data.refundProgressTip;

      refundProgressTip = this.getRenfundTip(refundItem.refund_type, refundItem.progress);
      refundItem.order_item.spec_str = this.setSpec(refundItem.order_item.spec_str);
      refundItem.reason = that.translator(refundItem.reason, 'reason');
      refundItem.refund_type = that.translator(refundItem.refund_type, 'type');
      refundItem.progress = refundItem.progress.map(item => {
        return item = {
          time: Utils.formatTimestamp(item.time, 'ymd') + ' ' + Utils.formatTimestamp(item.time, 'hm'),
          status: that.translator(item.status, refundTypeOperator)
        }
      });

      this.setData({
        id: id,
        refundProgressTip: refundProgressTip,
        refundItem: refundItem,
        shipCarriers: SHIP_CARRIERS
      })
      Utils.delayHideToast();
    }).catch(err => {
      wx.showModal({
        title: '网络似乎出了问题',
        content: '请稍后重试'
      });
    });
  },

  // 根据售后状态返回提示语
  getRenfundTip(type, progressArr) {
    let tip = '';
    let merchantName = Config.WX_EXT.MERCHANT_NAME
    let currentProgress = progressArr[progressArr.length - 1].status;
    if (type === 'return') {

      if (currentProgress === 'denied') {
        tip = '您的申请不符合' + merchantName + '退换货条件，您可以在48小时内重新提交。若有疑问，请联系客服。'
        progressArr.forEach(item => {
          if (item.status === 'approved') {
            tip = '您退回的商品与您提交描述不符，您可以在48小时内核对后重新提交。若有疑问，请联系客服。';
          }
        })
      }
    } else if (type === 'refund_only') {
      if (currentProgress === 'denied') {
        tip = '您的申请不符合' + merchantName + '退换货条件，您可以在48小时内重新提交。若有疑问，请联系客服。'
      }
    }

    return tip
  },

  // 转换
  translator(key, operator) {
    const REFUND_REASON = Config.REFUND_REASON;
    const REFUND_TYPE = Config.REFUND_TYPE;
    const REFUND_STATUS = Config.REFUND_STATUS;
    let words = '';

    if (operator === 'reason') {
      REFUND_REASON.forEach(item => {
        if (item.code && item.code === key) {
          words = item.str;
        }
      })
    }

    if (operator === 'type') {
      REFUND_TYPE.forEach(item => {
        if (item.name && item.name === key) {
          words = item.value;
        }
      })
    }

    if (operator === 'return') {
      REFUND_STATUS.RETURN.forEach(item => {
        if (item.code && item.code === key) {
          words = item.str;
        }
      })
    }

    if (operator === 'refund') {
      REFUND_STATUS.REFUND_ONLY.forEach(item => {
        if (item.code && item.code === key) {
          words = item.str;
        }
      })
    }

    return words;
  },

  // 设置商品规格
  setSpec(spec) {
    let specStr = '';

    if (!spec) {
      return specStr;
    }

    let specs = spec.split(',');
    for (let t = 0; t < specs.length; t++) {
      if (specStr) {
        specStr += ' / ' + specs[t].split(':')[1];
      } else {
        specStr += specs[t].split(':')[1];
      }
    }

    return specStr;
  },

  // 物流选择绑定
  bindPickerChange(e) {
    let index = e.detail.value;

    this.setData({
      shipCarrierIndex: e.detail.value,
    })
  },

  // 物流单号输入绑定
  bindKeyInput(e) {
    let waybillNumber = e.detail.value;
    this.setData({
      waybillNumber: waybillNumber
    })
  },

  // 修改售后申请
  modify() {
    let refundItem = this.data.refundItem;
    refundItem = JSON.stringify(refundItem);

    wx.navigateTo({
      url: Config.ROUTE.ORDER_REFUND + '?refundItem=' + refundItem + '&modify=true'
    });
  },

  // 提交退货物流信息
  setExpress() {
    let refundId = this.data.refundItem.order_item.refund_id;
    let waybillNumber = this.data.waybillNumber;
    let shipCarrierIndex = this.data.shipCarrierIndex;
    let that = this;

    if (shipCarrierIndex == 0) {
      this.validatePop('请选择物流');
      return
    }

    if (!waybillNumber) {
      this.validatePop('单号不能为空');
      return
    }

    App.request({
      url: Config.API.REFUND_PUT,
      method: 'PUT',
      data: {
        refundId: refundId,
        ship_carrier: Config.SHIP_CARRIERS[shipCarrierIndex].code,
        waybill_number: waybillNumber
      }
    }).then(res => {
      wx.showModal({
        title: '恭喜',
        content: '提交物流信息成功！',
        showCancel: false,
        complete: function () {
          wx.redirectTo({
            url: Config.ROUTE.ORDER_REFUND_STATE + '?id=' + that.data.id,
          })
        }
      });
    }).catch(err => {
      wx.showModal({
        title: '网络似乎出了问题',
        content: '请稍后重试'
      });
    });
  },

  // 获取物流信息
  getTrackingInfo: function (e) {
    const refundItem = this.data.refundItem;
    const coverImage = refundItem.order_item.cover_image;
    const shipCarrier = refundItem.ship_carrier;
    const waybillNumber = refundItem.waybill_number;
    const trackingInfo = refundItem.tracking_info || [];

    const info = {
      coverImage,
      shipCarrier,
      waybillNumber,
      trackingInfo
    }

    wx.setStorageSync('tracking_info', info);
    wx.navigateTo({
      url: Config.ROUTE.TRACKING_INFO
    });
  },

  // 弹窗组件
  validatePop(text) {
    wx.showModal({
      title: '提示',
      content: text,
      showCancel: false
    })
  }
})
