const app = getApp()

Page({
  data: {
    firstThree: '',
    lastFive: '',
    canQuery: false,
    isLoading: false,
    showResult: false,
    result: ''
  },

  inputFirstThree(e) {
    const value = e.detail.value.trim()
    this.setData({ firstThree: value }, this.checkCanQuery)
  },

  inputLastFive(e) {
    const value = e.detail.value.trim()
    this.setData({ lastFive: value }, this.checkCanQuery)
  },

  checkCanQuery() {
    const { firstThree, lastFive } = this.data
    const canQuery = /^1\d{2}$/.test(firstThree) && /^\d{5}$/.test(lastFive)
    this.setData({ canQuery })
  },

  queryPhone() {
    const { firstThree, lastFive, canQuery } = this.data
    if (!canQuery) {
      wx.showToast({ title: '请输入正确格式', icon: 'none' })
      return
    }

    this.setData({ isLoading: true, showResult: false })
    const feature = firstThree + lastFive

    wx.cloud.callFunction({
      name: 'queryPhone',
      data: { feature },
      timeout: 20000, 
      success: (res) => {
        console.log('[index] 云函数返回：', res)
        this.setData({ isLoading: false })

        if (res.result?.success) {
          const result = res.result.result
          this.saveHistory(firstThree, lastFive, result)
          this.setData({
            result,
            showResult: true
          })
        } else {
          wx.showToast({
            title: res.result?.error || '查询失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error('[index] 调用失败：', err)
        this.setData({ isLoading: false })
        wx.showToast({
          title: '网络异常，请稍后重试',
          icon: 'none'
        })
      }
    })
  },

  saveHistory(firstThree, lastFive, result) {
    const history = wx.getStorageSync('queryHistory') || []
    history.unshift({
      phone: `${firstThree}***${lastFive}`,
      result,
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