# 小电商

# 准备工作

# 目录结构

```bash
├── templates
|  └── shanghai
└── utils
   ├── auth.js
   ├── config.js
   ├── constants.js
   ├── countdown.js
   ├── ga.js
   ├── index.js
   ├── login.js
   ├── pay.js
   ├── polyfill.js
   ├── request.js
   ├── rsvp.js
   ├── search.js
   ├── shopping-coupon
   ├── sku-status
   ├── storage.js
   ├── util.js
   ├── utils.js
   └── weCropper.core.js
```

* utils: 这是通用的工具库
  - auth.js: 授权认证
  - config.js: 存放配置项，比如服务的 URL
  - constants.js: 常量表
  - countdown.js: 倒计时组件逻辑
  - ga.js: 需要使用 ga 可引入
  - login.js: 登录相关函数
  - pay.js: 微信支付
  - polyfill.js: 小程序没实现的一些方法
  - request.js: 封装了小程序的请求
  - resvp.js: Promise 的一种实现，兼容低版本小程序
  - search.js: 封装了 algolia 的搜索服务
  - shopping-coupon: 购物车优惠券算法
  - sku-status： sku 状态算法
  - utils.js: 通用的函数库
  - weCropper.core.js: 封装了小程序的裁剪图片功能

* templates: 这是小程序的模板库，`shanghai` 是我们的一套模板
