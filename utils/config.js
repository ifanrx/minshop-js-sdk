const LOCAL_SESSION_KEY = 'rhhwyt6kgxa3jolo1ubxwg6alcrdfkwr';

// 获取 ext.json 内配置对象，提供对应的设置
const WX_EXT = wx.getExtConfigSync && wx.getExtConfigSync();
// local: 本地, qa: 测试环境, production: 生产环境
const env = WX_EXT.ENV || 'production';

let baseUrl;
let API_HOST;

// 新品货架 ID
let LATEST_PRODUCT_SHELF_ID = 67;
let PROMOTIONAL_PRODUCT_SHELF_ID = 115;

if (env === 'local') {
  baseUrl = 'http://localhost:8000/';
  API_HOST = 'http://localhost:8000';

  LATEST_PRODUCT_SHELF_ID = 46;
  PROMOTIONAL_PRODUCT_SHELF_ID = 115;
} else if (env === 'qa') {
  baseUrl = 'https://viac13-p.eng-vm.can.corp.ifanr.com/';
  API_HOST = 'https://viac13-p.eng-vm.can.corp.ifanr.com';

  LATEST_PRODUCT_SHELF_ID = 46;
} else {
  baseUrl = 'https://minshop.com/';
  API_HOST = 'https://minshop.com';
}

const SHELF_TYPES = {
  LIMITED_TIME: 'limited_time',
  ACTIVITY: 'activity',
  VENDOR: 'vendor',
  CATEGORY: 'category'
}

const apiBase = 'api/v1.4/';

const ORDER_STATUS = {
  NOT_PAID: 'not_paid',
  ORDER_PLACED: 'order_placed',
  CANCELLED: 'cancelled',
  DELETED: 'deleted',
};

const ORDER_ITEM_STATUS = {
  INITIATED: 'initiated',
  PROCESSING: 'processing',
  PENDING_REDEMPTION: 'pending_redemption',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDING: 'refunding'
};

// 退款类型
const REFUND_TYPE = [{
  value: '退货',
  name: 'return',
  checked: false
}, {
  value: '仅退款',
  name: 'refund_only',
  checked: false
}];

// 退款状态
const REFUND_STATUS = {};

// 退货退款
REFUND_STATUS.RETURN = [{
    code: 'item_received',
    str: '待退款'
  },
  {
    code: 'pending_review',
    str: '售后待审核'
  },
  {
    code: 'approved',
    str: '退回商品待确认'
  },
  {
    code: 'admin_approved',
    str: '待退款'
  },
  {
    code: 'bursar_approved',
    str: '待退款'
  },
  {
    code: 'refund_issued',
    str: '退款成功'
  },
  {
    code: 'refund_failure',
    str: '待退款'
  },
  {
    code: 'denied',
    str: '售后未通过'
  },
]

// 仅退款
REFUND_STATUS.REFUND_ONLY = [{
    code: 'item_received',
    str: '待退款'
  },
  {
    code: 'pending_review',
    str: '售后待审核'
  },
  {
    code: 'approved',
    str: '待退款'
  },
  {
    code: 'admin_approved',
    str: '待退款'
  },
  {
    code: 'bursar_approved',
    str: '待退款'
  },
  {
    code: 'refund_issued',
    str: '退款成功'
  },
  {
    code: 'refund_failure',
    str: '待退款'
  },
  {
    code: 'denied',
    str: '售后未通过'
  },
]

// 退款原因
const REFUND_REASON = [{
    str: '请选择退款原因'
  },
  {
    code: 'seven_days',
    str: '七天无理由退换货'
  },
  {
    code: 'refund_shipping',
    str: '退运费'
  },
  {
    code: 'product_damaged',
    str: '收到商品破损'
  },
  {
    code: 'not_received',
    str: '未发货／未收到货品'
  },
  {
    code: 'incomplete',
    str: '包裹少货'
  },
  {
    code: 'unexpected',
    str: '多拍／拍错／不想要了'
  },
  {
    code: 'other',
    str: '其它'
  }
]

// 物流
const SHIP_CARRIERS = [{
    str: '请选择物流'
  },
  {
    code: 'ems',
    str: 'EMS快递'
  },
  {
    code: 'rufengda',
    str: '如风达快递'
  },
  {
    code: 'shunfeng',
    str: '顺丰快递'
  },
  {
    code: 'shentong',
    str: '申通快递'
  },
  {
    code: 'yuantong',
    str: '圆通快递'
  },
  {
    code: 'yunda',
    str: '韵达快递'
  },
  {
    code: 'zhongtong',
    str: '中通快递'
  },
  {
    code: 'zhongyouwuliu',
    str: '中邮快递'
  },
  {
    code: 'tiantian',
    str: '天天快递'
  },
  {
    code: 'yousu',
    str: '优速快递'
  },
  {
    code: 'baishihuitong',
    str: '百世汇通'
  },
  {
    code: 'debang',
    str: '德邦快递'
  },
  {
    code: 'kuaijie',
    str: '快捷快递'
  },
  {
    code: 'jiuye',
    str: '九曳供应链'
  },
  {
    code: 'quanfeng',
    str: '全峰快递'
  },
  {
    code: 'suer',
    str: '速尔快递'
  },
  {
    code: 'zhaijisong',
    str: '宅急送'
  },
  {
    code: 'jd',
    str: '京东物流'
  }
]

const CONFIG = {
  DEBUG: (env === 'local'),
  API_HOST,
  LOCAL_SESSION_KEY,
  LATEST_PRODUCT_SHELF_ID,
  PROMOTIONAL_PRODUCT_SHELF_ID,
  SHELF_TYPES,
  WX_EXT,

  API: {
    ANONYMOUS_SESSION: '/danshui/anonymous_session/',
    DECRYPTION: '/danshui/decryption/',
    JSCODE_AUTH: '/danshui/jscode_auth/',

    BANNER_QUERY: '/api/v1.4/campaign_banner/',
    FEATURED_QUERY: '/api/v1.4/featured_merchandise/',

    PRODUCT_QUERY: '/api/v1.4/product_preview/',
    PRODUCT_DETAIL: '/api/v1.4/product/:productId/',
    PRODUCT_DESCRIPTION: '/api/v1.4/miniapp-product/:productId/',
    PRODUCT_RECOMMEND: '/api/v1.4/product_recommend/',
    PRODUCT_COUPON: '/api/v1.4/product-coupon/:productId/',

    SHELF_QUERY: '/api/v1.4/shelf/',
    SHELF_PRODUCT_QUERY: '/api/v1.4/shelf_preview/',

    // 需要登录才能使用的 API
    ADDRESS_QUERY: '/api/v1.4/address_book/:sessionkey/',
    ADDRESS_OPERATION: '/api/v1.4/address_book/:addressId/:sessionkey/',
    CATEGORY_QUERY: '/api/v1.4/category/',
    CATEGORY_DETAIL: '/api/v1.4/category/:categoryId/',
    COUPON_QUERY: '/api/v1.4/coupon/:sessionkey/',
    COUPON_REDEEM: '/api/v1.4/redeem/:sessionkey/',
    COUPON_PUBLIC: '/api/v1.4/coupon_public/:sessionkey/',
    CHECKOUT: '/api/v1.4/checkout/:sessionkey/',
    FLASH_SALE: '/api/v1.4/instant_deal/',
    GIFT_REMEED: '/api/v1.4/gift/redeem/:sessionkey/',
    GIFT_ORDER: '/api/v1.4/gift_order/:sessionkey/',
    GIFT_ORDER_QUERY: '/api/v1.4/gift_order/:signedId/:sessionkey/',
    GIFT_ORDER_RECEIVED: '/api/v1.4/gift/received/:sessionkey/',
    GIFT_ORDER_CONFIRM: '/api/v1.4/gift/orderitem/:sessionkey/',
    OFFER: '/api/v1.4/offer/:sequenceId/:sessionkey/',
    ORDER_QUERY: '/api/v1.4/order/:sessionkey/',
    ORDER_STATES: '/api/v1.4/orderstats/:sessionkey/',
    ORDER_OPERATION: '/api/v1.4/order/:orderId/:sessionkey/',
    ORDER_ITEM_OPERATION: '/api/v1.4/orderitem/:orderItemId/:sessionkey/',
    REDIS_COUPON: '/api/v1.4/redis-coupon/:sessionkey/',
    PAYMENT: (env === 'production' ? '' : '/pepe') + '/payment/:orderId/:sessionkey/',
    REFUND_QUERY: '/api/v1.4/refund/:orderItemId/:sessionkey/',
    REFUND_OPERATION: '/api/v1.4/refund/:sessionkey/',
    REFUND_PUT: '/api/v1.4/refund/:refundId/:sessionkey/',
    SHIPPING_RATE: '/api/v1.4/shipping-rate/:sessionkey/',
    SHOPPING_CART_QUERY: '/api/v1.4/shopping_cart/',
    SHOPPING_CART_OPERATION: '/api/v1.4/shopping_cart/:shoppingCartId/:sessionkey/',
    SHOPPING_CART_COUPON: '/api/v1.4/shopping-cart-coupon/',
    TEMuserPLATE_MESSAGE_SUBSCRIBE: '/api/v1.4/template_message_subscribe/:sessionkey/',
    USER_PROFILE: '/api/v1/user_profile/:sessionkey/',
    USER_PROFILE_MODIFY: '/api/v1/user_profile/:id/:sessionkey/',
    FEEDBACK: '/api/v1.4/feedback/:sessionkey/',
    COLLECTION_LIST: '/api/v1.4/favorite/:sessionkey/',
    COLLECT_PRODUCT: '/api/v1.4/product/like/:productId/:sessionkey/',

    // 使用 wx.uploadFile 调用，故此处不添加 :seeionkey，改为在 url 参数中拼接 '?sessionkey=' + sessionkey
    USER_AVATAR: '/api/v1/user/avatar/',
    UPLOAD_IMG_URL: '/api/v1.4/user/image_upload/',

    // 加上 :sessionkey 是为了确保已经登录，可正常获取返回的 user_id 数据，实际上该接口不需要 sessionkey
    RECOMMENDATION: 'https://yellowstone.ifanr.com/v1/canton/recommendation/:sessionkey/',

    // 授权相关
    SESSION_INIT: '/api/v3/pepe/miniapp/session/init/',
    SESSION_AUTHENTICATE: '/api/v3/pepe/miniapp/session/authenticate/',
  },

  API_URL: {
    LOGIN_URL: baseUrl + '/danshui/jscode_auth/',
    LOGIN_VERIFY_URL: baseUrl + '/danshui/decryption/',
    BANNER_QUERY: baseUrl + apiBase + 'campaign_banner/',
    FEATURED_QUERY: baseUrl + apiBase + 'featured_merchandise',
    SHELF_QUERY: baseUrl + apiBase + 'shelf/',
    PRODUCT_LIST: baseUrl + apiBase + 'product_preview/',
    indexShelfUrl: baseUrl + 'api/v1.4/product_preview/?order_by=-priority&img_size=small',
    newShelfUrl: baseUrl + 'api/v1.4/product_preview/?order_by=-id&img_size=small',
    hotShelfUrl: baseUrl + 'api/v1.4/product_preview/?order_by=-sold_count&img_size=small',
    PRODUCT_DETAIL_URL: baseUrl + apiBase + 'product/',
    PRODUCT_DESCRIPTION_URL: baseUrl + apiBase + 'miniapp-product/',
    PRODUCT_RECOMMEND: baseUrl + apiBase + 'product_recommend/',
    SHELF_PRODUCT_QUERY: baseUrl + apiBase + 'shelf_preview/',
    SHOPPING_CART_URL: baseUrl + apiBase + 'shopping_cart/',
    ADDRESS_URL: baseUrl + 'api/v1.4/address_book/',
    ORDER_URL: baseUrl + 'api/v1.4/order/',
    ORDER_ITEM_URL: baseUrl + 'api/v1.4/orderitem/',
    PAY_URL: baseUrl + '/danshui/payment/',
    GIFT_ORDER: baseUrl + apiBase + 'gift_order/',
    GIFT_REMEED: baseUrl + apiBase + 'gift/redeem/',
    USER_PROFILE: baseUrl + 'api/v1/user_profile/',
    REFUND_URL: baseUrl + apiBase + 'refund/'
  },

  ROUTE: {
    HOME: '../index/index',
    ADDRESS_FORM: '../address-form/address-form',
    ACTIVITY: '../activity/activity',
    BRAND: '../brand/brand',
    BRAND_LIST: '../brand-list/brand-list',
    COUPON_OFFER: '../coupon-offer/coupon-offer',
    CATEGORY: '../category/category',
    CATEGORY_DETAIL: '../category-detail/category-detail',
    DETAIL: '../detail/detail',
    FLASH_SALE: '../flash-sale/flash-sale',
    GIFT: '../gift/gift',
    GIFT_INTRO: '../gift-intro/gift-intro',
    LIST: '../list/list',
    ORDER_DETAIL: '../order-detail/order-detail',
    ORDER_REFUND: '../order-refund/order-refund',
    ORDER_REFUND_STATE: '../order-refund-state/order-refund-state',
    PAY: '../pay/pay',
    PAYMENT_RESULT: '../payment-result/payment-result',
    POETRY: '../poetry/poetry',
    POETRY_EDIT: '../poetry-edit/poetry-edit',
    POETRY_SHARE: '../poetry-share/poetry-share',
    SEARCH: '../search/search',
    SHOPPING_CART: '../shopping-cart/shopping-cart',
    TRACKING_INFO: '../tracking-info/tracking-info',
    USER_CENTER: '../user-center/user-center',
    VENUE: '../venue/venue'
  },

  HOME_PRODUCT_LIST_LIMIT: 10,
  COUPON_LIST_LIMIT: 10,
  ORDER_LIST_LIMIT: 20,
  PRODUCT_LIST_LIMIT: 20,

  // Algolia 相关配置信息
  ALGOLIA_APPLICATIONID: '7TN0U2FL3Q',
  ALGOLIA_SEARCHINLYAPIKEY: '698fda22894bebbf9179c2a4cbf30756',
  ALGOLIA_INDEX_NAME: 'prod_canton_product',
  ALGOLIA_AGENT: 'Algolia for vanilla JavaScript 3.10.2',

  BUY_METHOD: {
    GIFT_GIVING: 'giftGinving',
    BUY_NOW: 'buyNow',
    ADD_TO_SHOPPING_CART: 'addToShoppingCart'
  },

  ORDER_STATUS_STR: {
    [ORDER_STATUS.NOT_PAID]: '未付款',
    [ORDER_STATUS.ORDER_PLACED]: '已支付',
    [ORDER_STATUS.CANCELLED]: '订单已取消',
    [ORDER_STATUS.DELETED]: '订单已删除',
  },

  ORDER_ITEM_STATUS_STR: {
    [ORDER_ITEM_STATUS.INITIATED]: '待付款',
    [ORDER_ITEM_STATUS.PROCESSING]: '待发货',
    [ORDER_ITEM_STATUS.PENDING_REDEMPTION]: '待领取',
    [ORDER_ITEM_STATUS.SHIPPED]: '待收货',
    [ORDER_ITEM_STATUS.DELIVERED]: '交易成功',
    [ORDER_ITEM_STATUS.CANCELLED]: '已取消',
    [ORDER_ITEM_STATUS.REFUNDING]: '已申请售后'
  },

  REFUND_TYPE: REFUND_TYPE,

  REFUND_STATUS: REFUND_STATUS,

  REFUND_REASON: REFUND_REASON,

  SHIP_CARRIERS: SHIP_CARRIERS,

  ORDER_BY: {
    DEFAULT: '-priority,-id',
    NEW: '-id',
    HOT: '-sold_count,-id'
  },

  NAV_TAB_ACTIVE_CLASS: 'nav-tab-active',

  BANNER_SWIPER: {
    circular: true,
    autoplay: true,
    interval: 5000,
    duration: 300,
    indicatorDots: true,
    indicatorColor: '#fff',
    indicatorActiveColor: '#101010'
  },

  SERVICE_GUARANTEES: [
    '正品保证',
    '七天退换',
    '极速退款',
    '全场包邮'
  ],

  COUPON_EXPLAIN: [{
    question: 'Q1: 优惠券是什么？',
    answer: '优惠券是专供店内消费者的现金抵用券，仅限店内消费使用。'
  }, {
    question: 'Q2: 优惠券可以做什么？',
    answer: '可以抵扣在线支付时的实际支付金额。'
  }, {
    question: 'Q3: 一个优惠券能拆开多次使用吗？',
    answer: '不能，一张优惠券只能一次性使用，不能分开使用。'
  }, {
    question: 'Q4: 一个订单可以使用多个优惠券吗？',
    answer: '不能，一个订单只能使用一张优惠券，不能多张共用。'
  }, {
    question: 'Q5: 优惠券抵用额超过订单价格怎么办？',
    answer: '超出的部分就浪费了，可以选择面额更合适的优惠券或多买一些商品。'
  }, {
    question: 'Q6: 下单的时候使用了优惠券，但是后来订单取消了，优惠券还会返还吗？',
    answer: '不会，若有特殊情况可联系客服。'
  }]
};

module.exports = CONFIG;
