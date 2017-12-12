import Config from '../../utils/config'

const App = getApp();

Page({
  data: {
    wxExt: Config.WX_EXT,
  },
  onLoad(options) {
    App.gaScreenView('关于我们');
  },
});
