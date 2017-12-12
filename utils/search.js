import Config from './config'

const ALGOLIA_APPLICATIONID = Config.ALGOLIA_APPLICATIONID
const ALGOLIA_SEARCHINLYAPIKEY = Config.ALGOLIA_SEARCHINLYAPIKEY
const ALGOLIA_INDEX_NAME = Config.ALGOLIA_INDEX_NAME
const ALGOLIA_AGENT = Config.ALGOLIA_AGENT

const REQUEST_HEADERS = {
  'x-algolia-api-key': ALGOLIA_SEARCHINLYAPIKEY,
  'x-algolia-application-id': ALGOLIA_APPLICATIONID,
  'x-algolia-agent': ALGOLIA_AGENT,
}

const URL = [ALGOLIA_APPLICATIONID + '-dsn.algolia.net',
  ALGOLIA_APPLICATIONID + '-2.algolianet.com',
]

const URL_LENGTH = URL.length

const timeoutFlag = {}
let currentPage = 0
let tries = 0

const _setParams = currentPage => {
  const params = {
    hitsPerPage: 20,
    page: currentPage,
    facets: '*',
    facetFilters: [
      'status: -off_shelf',
      'status: -deleted',
    ],
    numericFilters: ['mchid=' + Config.WX_EXT['HTTP_X_PEPE_MERCHANT_ID']],
  }
  return params
}

const _getSearchParams = (args, param) => {
  let params = 'query=' + param
  if (args === undefined || args === null) {
    return params
  }
  for (let key in args) {
    if (key !== null && args[key] !== undefined && args.hasOwnProperty(key)) {
      params += params === '' ? '' : '&'
      params += key + '=' + encodeURIComponent(Object.prototype.toString.call(args[key]) === '[object Array]' ? JSON.stringify(args[key]) : args[key])
    }
  }
  return params
};

const _setTimeoutFlag = callback => {
  let timer = null
  timer = setTimeout(() => {
    timeoutFlag.timer = {isTimeout: true}
    callback && callback()
  }, 4000)

  timeoutFlag.timer = {isTimeout: false}

  return timer
}

function search(searchStr, callback, params) {
  const requestURL = 'https://' + URL[tries] + '/1/indexes/' + ALGOLIA_INDEX_NAME + '/query?x-algolia-api-key=' + ALGOLIA_SEARCHINLYAPIKEY + '&x-algolia-application-id=' + ALGOLIA_APPLICATIONID + '&x-algolia-agent=' + encodeURIComponent(ALGOLIA_AGENT)
  let paramsStr

  if (params == undefined) {
    currentPage = 0
  }

  params = _setParams(currentPage)

  if (tries < URL_LENGTH) {
    paramsStr = _getSearchParams(params, searchStr)
  }

  const timer = _setTimeoutFlag(() => {
    tries += 1

    if (tries < URL_LENGTH) {
      search(searchStr, callback, params)
    }

    if (tries > URL_LENGTH - 1) {
      tries = 0

      wx.hideToast()
      wx.showModal({
        content: '网络似乎出了问题，请重试～',
        success: res => {
          if (res.confirm) {
            search(searchStr, callback, params)
          }
        },
      })
    }
  })

  wx.request({
    url: requestURL,
    method: 'POST',
    header: REQUEST_HEADERS,
    data: {
      params: paramsStr,
    },
    success: res => {
      if (!timeoutFlag.timer.isTimeout) {
        if (res.statusCode == 200) {
          callback && callback(res)
        } else {
          tries += 1

          if (tries < URL_LENGTH) {
            search(searchStr, callback, params)
          }

          if (tries > URL_LENGTH - 1) {
            tries = 0
            wx.hideToast()
            wx.showModal({
              content: '网络似乎出了问题，请重试～',
              showCancel: false,
              success: function(res) {
                if (res.confirm) {
                  search(searchStr, callback, params)
                }
              },
            })
          }
        }
      }

      clearTimeout(timer)
    },
  })
}

function searchNext(searchStr, isNotMore, callback) {
  if (isNotMore) {
    return
  }
  currentPage += 1
  const params = _setParams(currentPage)
  search(searchStr, callback, params)
}

module.exports = {search, searchNext}
