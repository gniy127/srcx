const app = getApp()

Page({
  data: {
    phone: '',
    displayPhone: '',
    canQuery: false,
    isLoading: false,
    showResult: false,
    result: ''
  },

  inputPhone(e) {
    const value = e.detail.value.trim()
    this.setData({ phone: value })
    const canQuery = /^1\d{10}$/.test(value)
    this.setData({ canQuery })
  },

  onQueryTap() {
    const { phone, canQuery } = this.data
    if (!canQuery) {
      wx.showToast({ title: '请输入正确的11位手机号', icon: 'none' })
      return
    }

    const feature = phone.substring(0, 3) + phone.substring(6)
    const displayPhone = phone.substring(0, 3) + '****' + phone.substring(6)

    this.setData({ isLoading: true, showResult: false })

    wx.cloud.callFunction({
      name: 'queryPhone',
      data: { feature: feature },
      success: (res) => {
        this.setData({ isLoading: false })
        const data = res.result
        if (data && data.success) {
          const result = data.result
          this.saveHistory(displayPhone, result)
          this.setData({
            result: result,
            displayPhone: displayPhone,
            showResult: true
          })
        } else {
          wx.showToast({ title: '查询失败', icon: 'none' })
        }
      },
      fail: (err) => {
        this.setData({ isLoading: false })
        wx.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
      }
    })
  },

  saveHistory(displayPhone, result) {
    const history = wx.getStorageSync('queryHistory') || []
    history.unshift({
      phone: displayPhone,
      result: result,
      time: new Date().toLocaleString()
    })
    if (history.length > 20) history.pop()
    wx.setStorageSync('queryHistory', history)
  },

  toHistory() {
    const history = wx.getStorageSync('queryHistory') || []
    if (history.length === 0) {
      wx.showToast({ title: '暂无查询历史', icon: 'none' })
      return
    }

    let historyText = ''
    history.forEach((item, index) => {
      const resultText = item.result === '是骚扰电话' ? '是' : '不是'
      const dateOnly = item.time.split(' ')[0]
      historyText += `${index + 1}. 号码：${item.phone}\n结果：${resultText}\n时间：${dateOnly}\n\n`
    })

    wx.showModal({
      title: '查询历史（最近20条）',
      content: historyText,
      showCancel: false
    })
  },

  toAdmin() {
    wx.navigateTo({ url: '/pages/admin/admin' })
  }
})
