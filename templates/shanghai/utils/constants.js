module.exports = {
  // 本地存储 key
  STORAGE_KEY: {
    AUTHORIZED: 'authorized',
    AVAILABLE_COUPON_LIST: 'available_coupon_list',
    SESSION_KEY: 'session_key',
    SHOPPING_CART: 'shopping_cart',
    SKU_TO_PAY: 'sku_to_pay',
    USERINFO: 'userinfo',
    USER_PROFILE: 'user_profile'
  },

  // 请求返回状态
  STATUS_CODE: {
    CREATED: [200, 201],
    SUCCESS: [200],
    UPDATE: [200, 204],
    PATCH: [200, 202],
    DELETE: [204],
    UNAUTHORIZED: [401],
    NOT_FOUND: [404],
    SERVER_ERROR: [500],
  },

  // 兑换优惠券错误返回的信息
  COUPON_REDEEMED_ERROR: {
    INVALID: 'invalid coupon code or password',
    REDEEMED: 'coupon already redeemed',
    EXPIRED: 'coupon expired',
    FAILED: 'redeem failed',
  },

  // 领取优惠券返回的状态
  COUPON_OFFER_STATUS: {
    REDEEMED: 'redeemed',
    REACH_LIMIT: 'reach_limit',
    OUT_OF_STOCK: 'out_of_stock'
  },

  // 首页活动优惠券列表 ID
  HOME_ACTIVITY_COUPONS: [],

  // 主会场优惠券列表 ID
  VENUE_COUPON_SEQUENCES: [214, 215, 216, 217],

  // 送礼模板图片
  etcGiftTemps: [{
    img: 'http://canton-assets.ifanrusercontent.com/media/user_files/canton/bf/d3/bfd32a6abb7e621137e90898942ed2b5d732cb88-06b80114450ef833603e4a4f5229cc46f9f86bcc.jpg',
    name: '情人节',
    selected: false
  },
  {
    img: 'http://canton-assets.ifanrusercontent.com/media/user_files/canton/bf/f1/bff162d9846b8eb0603c24a99940a64737cb8220-31973c128c4ed00882aade192b3f6cfa14d5deea.jpg',
    name: '亲人',
    selected: false
  },
  {
    img: 'http://canton-assets.ifanrusercontent.com/media/user_files/canton/ff/c6/ffc60ae957022c6bd9a8081be9e44e9801974284-954335d441f0077f70da7626fed04c301a8615f7.jpg',
    name: '长辈',
    selected: false
  },
  {
    img: 'http://canton-assets.ifanrusercontent.com/media/user_files/canton/a0/3b/a03ba29d3085d31fbe319146c47021f932e2cf69-a11aa0ca5df8f653d75be48da61438e2f6edbce3.jpg',
    name: '闺蜜',
    selected: false
  },
  {
    img: 'http://canton-assets.ifanrusercontent.com/media/user_files/canton/fd/37/fd37558500f218a9262a2765b1e548801991e4be-9ca3a55ac8bb4ba8a0d1d60904c08874862aead5.jpg',
    name: '兄弟',
    selected: false
  }
  ]
};