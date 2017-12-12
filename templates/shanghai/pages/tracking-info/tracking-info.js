const App = getApp();

Page({
  onLoad() {
    const trackingInfo = App.storage.get('tracking_info');
    console.log(trackingInfo);
    if (trackingInfo && trackingInfo.waybillNumber == undefined) {
      trackingInfo.trackingInfo = [{ status: '' }];
      trackingInfo.shipCarrier = ''
      trackingInfo.waybillNumber = ''
    }
    console.log(trackingInfo);

    this.setData({
      trackingInfo
    });

    App.storage.set('tracking_info', '');
    App.gaScreenView('物流追踪');
  }
});
