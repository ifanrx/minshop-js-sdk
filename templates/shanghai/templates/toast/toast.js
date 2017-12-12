// 模态框提示
function showToast(page, toastModalText = '', delay = 1000) {
  page.setData({
    toastModalStatus: true,
    toastModalText
  });

  setTimeout(() => {
    page.setData({
      toastModalStatus: false
    })
  }, delay)
}

const toast = {
  showToast
}

export default toast