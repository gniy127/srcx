App({
  // 全局数据：存储骚扰号码特征值（前3后5）和完整号码映射
  globalData: {
    harassmentPhoneMap: {},
    adminPwd: "SRCX2026"      // 管理员默认密码
  },
  
  onLaunch() {
    
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上版本的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloudbase-3g08u0up52b48543', // 环境ID
        traceUser: true, // 跟踪用户行为
      });
    }

  
    this.loadHarassmentDataFromCloud();

   
    const storedData = wx.getStorageSync('harassmentPhoneMap');
    if (storedData) {
      this.globalData.harassmentPhoneMap = storedData;
    }
  },

  // 从云数据库加载骚扰号码数据
  loadHarassmentDataFromCloud() {
    const db = wx.cloud.database();
    db.collection('harassment_phones').get({
      success: (res) => {
        if (res.data.length > 0) {
          const cloudData = res.data[0].phoneMap || {};
          this.globalData.harassmentPhoneMap = cloudData;
          wx.setStorageSync('harassmentPhoneMap', cloudData); // 同步到本地
        }
      },
      fail: (err) => {
        console.error('云数据库加载失败', err);
      }
    });
  }
});
