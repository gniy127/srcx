App({
  globalData: {
    harassmentPhoneMap: {},
    adminPwd: "SRCX2026"
  },
  
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上版本的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloudbase-3g08u0up52b48543',
        traceUser: true,
      });
    }
    // 删掉 loadHarassmentDataFromCloud，不再启动时读整个数据库
  }
});
