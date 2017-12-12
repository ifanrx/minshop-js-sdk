const countdown = (that, timeLeft = 0, cb) => {
  const clock = formatDate(timeLeft)
  that.timer && clearTimeout(that.timer)

  if (!that.scrolling) {
    that.setData({
      clock,
    })
  }

  if (timeLeft <= 0) {
    that.setData({
      clock: {
        hr: '--',
        min: '--',
        sec: '--',
      },
    })
    cb && cb()
    return
  }

  that.timer = setTimeout(function() {
    timeLeft -= 1
    countdown(that, timeLeft, cb)
  }
    , 1000)
}

const venueCountDown = (that, endtime = new Date('Fri Nov 11 2017 23:59:59 GMT+0800 (CST)').getTime() / 1000) => {
  const now = Math.floor(new Date().getTime() / 1000)
  let timeLeft = endtime - now
  let venueClock = formatDate(timeLeft)
  that.venueTimer && clearTimeout(that.venueTimer)

  if (!that.scrolling) {
    that.setData({
      venueClock,
    })
  }

  if (timeLeft <= 0) {
    that.setData({
      clock: {
        hr: '--',
        min: '--',
        sec: '--',
      },
      isShowVenueClock: false,
      venueCountdownText: '双十一活动已结束',
    })
    that.venueTimer && clearTimeout(that.venueTimer)
    return
  }

  that.venueTimer = setTimeout(function() {
    timeLeft -= 1
    venueCountDown(that, endtime)
  }
    , 1000)
}

const formatDate = time => {
  const totalSecond = Math.floor(time)
  const totalHr = Math.floor(totalSecond / 3600)

  let hr = zero(totalHr % 24)
  let min = zero(Math.floor((totalSecond - totalHr * 3600) / 60))
  let sec = zero(totalSecond % 60)

  return {
    hr,
    min,
    sec,
  }
}

const zero = n => {
  n = parseInt(n, 10)
  if (n > 0) {
    if (n <= 9) {
      n = '0' + n
    }
    return String(n)
  } else {
    return '00'
  }
}

export default countdown
export {countdown, venueCountDown}
