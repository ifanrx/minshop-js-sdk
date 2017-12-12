const utils = require('./utils')

function init(skus) {
  let sku = ''

  const spliter = ','
  const selectedCache = {}

  const data = utils.toSkuList(skus)
  const keys = utils.getKeys(data)

  const r = utils.combineAttr(data, keys, spliter)
  const pathMap = utils.buildPathMap(r.items, spliter)

  const statusMap = utils.buildStatusMap(r.result, keys)

  function update() {
    utils.updateStatus(
      spliter,
      keys,
      r.result,
      pathMap,
      statusMap,
      utils.getSelectedItem(statusMap)
    )
  }

  function resetStatus(curr) {
    for (let key in statusMap) {
      if (key !== curr) {
        for (let value in statusMap[key]) {
          statusMap[key][value][0] = false
        }
      }
    }
  }

  function restoreStatus(curr) {
    for (let i = 0; i < keys.length; i++) {
      if (keys[i] !== curr && selectedCache[keys[i]]) {
        const lastSelected = statusMap[keys[i]][selectedCache[keys[i]]]
        if (lastSelected && lastSelected.length === 2 && !lastSelected[1]) {
          statusMap[keys[i]][selectedCache[keys[i]]][0] = true
          update()
        }
      }
    }
  }

  function getSku() {
    const result = utils.getSelectedItem(statusMap)
    let s = []

    for (let i = 0; i < result.length; i++) {
      const item = result[i]
      if (item) {
        s.push(item)
      }
    }

    if (s.length == keys.length) {
      const curr = pathMap[s.join(spliter)]
      if (curr && curr.length > 0) {
        sku = curr[0]
      }
    } else {
      sku = ''
    }
  }

  return function(location) {
    if (location && location.length === 2) {
      location = [String(location[0]), String(location[1])]

      const isActive = statusMap[location[0]][location[1]][0]
      const isDisabled = statusMap[location[0]][location[1]][1]

      if (!isActive) {
        for (let value in statusMap[location[0]]) {
          statusMap[location[0]][value][0] = false
        }
        statusMap[location[0]][location[1]][0] = true

        if (isDisabled) {
          statusMap[location[0]][location[1]][1] = false
          selectedCache[location[0]] = location[1]
          resetStatus(location[0])
          update()
          restoreStatus(location[0])
        } else {
          selectedCache[location[0]] = location[1]
          update()
        }
      } else {
        statusMap[location[0]][location[1]][0] = false
        delete selectedCache[location[0]]
        update()
      }

      getSku()
    }

    return {
      sku,
      selected: utils.getSelectedObj(statusMap, '0'),
      status: statusMap,
    }
  }
}

module.exports = init
